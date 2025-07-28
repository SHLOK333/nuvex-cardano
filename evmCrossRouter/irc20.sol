// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/ICrossDelegateInterfaceV4.sol";
import "../interfaces/ITokenManager.sol";
import "../interfaces/IBusinessInterface.sol";
import "../lib/BusinessDataLib.sol";
import "./BusinessManager.sol";

contract CrossRouter is BusinessManager {
    using SafeERC20 for IERC20;
    using SafeMath for uint256;

    address private crossDelegate;
    address private tokenManager;

    bytes32 public constant TRANSFER_ADMIN_ROLE = keccak256("TRANSFER_ADMIN_ROLE");

    event CrossUserLock(address indexed outReceiveAddr, uint256 outTokenPairID, uint256 feeAda, uint256 feeNative, bytes constraintCBOR);
    event CrossUserBurn(address indexed outReceiveAddr, uint256 outTokenPairID, uint256 feeAda, uint256 feeNative, bytes constraintCBOR);
    event TransferTo(address indexed toAddr, uint256 amount);

    constructor(
        address _crossDelegate,
        address _tokenManager,
        address _transferAdmin,
        address _routeAdmin,
        address _routeBusinessAdmin,
        address _routeFeeAdmin
    ) BusinessManager(_routeAdmin, _routeBusinessAdmin, _routeFeeAdmin) {
        crossDelegate = _crossDelegate;
        tokenManager = _tokenManager;
        _grantRole(TRANSFER_ADMIN_ROLE, _transferAdmin);
    }

    function crossUserLock(
        bytes32 smgID,
        uint256 tokenPairID,
        uint256 value,
        bytes calldata userAccount,
        bytes calldata routeData
    ) external payable {
        _checkAllowanceByTokenPairID(tokenPairID, value);
        BusinessDataLib.RouteDataParam memory routeDataParam = _checkRouteData(userAccount, routeData);

        (uint256 finalBalance, uint256 valueToDelegate) = _calculateBalances(routeDataParam);

        ICrossDelegateInterfaceV4(crossDelegate).userLock{value: valueToDelegate}(smgID, tokenPairID, value, userAccount);

        _transferLeftBalance(finalBalance);

        emit CrossUserLock(
            routeDataParam.outReceiveAddr,
            routeDataParam.outTokenPairID,
            routeDataParam.routeInfo.feeAda,
            routeDataParam.routeInfo.feeNative,
            routeDataParam.constraintCBOR
        );
    }

    function crossUserBurn(
        bytes32 smgID,
        uint256 tokenPairID,
        uint256 value,
        uint256 fee,
        address tokenAccount,
        bytes calldata userAccount,
        bytes calldata routeData
    ) external payable {
        _checkAllowance(tokenAccount, value);
        BusinessDataLib.RouteDataParam memory routeDataParam = _checkRouteData(userAccount, routeData);

        (uint256 finalBalance, uint256 valueToDelegate) = _calculateBalances(routeDataParam);

        ICrossDelegateInterfaceV4(crossDelegate).userBurn{value: valueToDelegate}(smgID, tokenPairID, value, fee, tokenAccount, userAccount);

        _transferLeftBalance(finalBalance);

        emit CrossUserBurn(
            routeDataParam.outReceiveAddr,
            routeDataParam.outTokenPairID,
            routeDataParam.routeInfo.feeAda,
            routeDataParam.routeInfo.feeNative,
            routeDataParam.constraintCBOR
        );
    }

    function transferTo(address toAddr, uint256 amount) external onlyRole(TRANSFER_ADMIN_ROLE) {
        require(toAddr != address(0), "Invalid address");
        require(address(this).balance >= amount, "Insufficient balance");
        payable(toAddr).transfer(amount);

        emit TransferTo(toAddr, amount);
    }

    function _transferLeftBalance(uint256 finalBalance) private {
        uint256 currentBalance = address(this).balance;
        require(currentBalance >= finalBalance, "Balance mismatch");

        uint256 excessBalance = currentBalance - finalBalance;
        if (excessBalance > 0) {
            payable(msg.sender).transfer(excessBalance);
        }
    }

    function _calculateBalances(BusinessDataLib.RouteDataParam memory routeDataParam)
        private
        returns (uint256, uint256)
    {
        uint256 finalBalance = address(this).balance - msg.value + routeDataParam.routeInfo.feeNative;
        uint256 valueToDelegate = msg.value - routeDataParam.routeInfo.feeNative;

        require(finalBalance >= 0 && valueToDelegate >= 0, "Balance calculation error");

        return (finalBalance, valueToDelegate);
    }

    function _checkRouteData(bytes calldata userAccount, bytes calldata routeData)
        private
        returns (BusinessDataLib.RouteDataParam memory)
    {
        (address outReceiveAddr, uint256 outTokenPairID, bytes memory constraintCBOR) = abi.decode(routeData, (address, uint256, bytes));

        BusinessDataLib.RouteInfo memory routeInfo = mapRouteInfo[userAccount];
        require(routeInfo.businessAddr != address(0), "Invalid business address");
        require(msg.value >= routeInfo.feeNative, "Insufficient native fee");
        require(IBusinessInterface(routeInfo.businessAddr).checkBusinessData(constraintCBOR), "Constraint validation failed");

        return BusinessDataLib.RouteDataParam(outReceiveAddr, outTokenPairID, constraintCBOR, routeInfo);
    }

    function _checkAllowanceByTokenPairID(uint256 tokenPairID, uint256 value) private {
        (uint256 fromChainID, bytes memory fromTokenAccount, , ) = ITokenManager(tokenManager).getTokenPairInfo(tokenPairID);
        address tokenAddress = _bytesToAddress(fromTokenAccount);

        if (tokenAddress != address(0)) {
            _checkAllowance(tokenAddress, value);
        }
    }

    function _checkAllowance(address tokenAccount, uint256 value) private returns (bool) {
        IERC20(tokenAccount).safeTransferFrom(msg.sender, address(this), value);

        uint256 allowance = IERC20(tokenAccount).allowance(address(this), crossDelegate);
        if (allowance < value) {
            IERC20(tokenAccount).approve(crossDelegate, 0);
            IERC20(tokenAccount).approve(crossDelegate, type(uint256).max);
        }

        return true;
    }

    function _bytesToAddress(bytes memory b) private pure returns (address addr) {
        assembly {
            addr := mload(add(b, 20))
        }
    }
}
