// SPDX-License-Identifier: MIT
// Wanchain

pragma solidity ^0.8.0;


import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "../interfaces/ICrossDelegateInterfaceV4.sol";
import "../interfaces/ITokenManager.sol";

import "../interfaces/IBusinessInterface.sol";
import "../lib/BusinessDataLib.sol";
import "./BusinessManager.sol";



contract CrossRouter is BusinessManager{
  using SafeERC20 for IERC20;
  using SafeMath for uint256;
  address addrCrossDelegate;
  address addrTokenManager;
  
  bytes32 public constant TRANSFER_ADMIN_ROLE = keccak256("TRANSFER_ADMIN_ROLE");

  constructor(address _addrCrossDelegate,
              address _addrTokenManager,
              address _addrTransferAdmin,
              address _addrRouteAdmin,
              address _addrRouteBusinessAdmin,
              address _addrRouteFeeAdmin
              ) BusinessManager(_addrRouteAdmin, _addrRouteBusinessAdmin, _addrRouteFeeAdmin) {
    addrCrossDelegate = _addrCrossDelegate;
    addrTokenManager  = _addrTokenManager;

    _grantRole(TRANSFER_ADMIN_ROLE, _addrTransferAdmin);
  }

  event CrossUserLock(address outReceiveAddr, uint256 outTokenPairID, uint256 feeAda, uint256 feeNative, bytes constraintCBOR);
  event CrossUserBurn(address outReceiveAddr, uint256 outTokenPairID, uint256 feeAda, uint256 feeNative, bytes constraintCBOR);
  event TransferTo(address indexed toAddr, uint256 amount);

  function crossUserLock(bytes32 smgID, uint256 tokenPairID, uint256 value, bytes calldata userAccount,
                        bytes calldata routeData)
    external
    payable
  {
    // 1 approve : tokenPairID => Erc20Token => approve
    checkAllowanceByToknePairID(tokenPairID, value);

    // 2 userAccount(routeIn) => routeHelpSc => checkData(routeData)
    // routeData 跨回来的参数：outReceive/outTokenPairID/constraintCBOR
    // 这里的feeAda和routeInfo中的feeAda???一个是我们合约收的fee,一个是routeIn合约的fee?
    BusinessDataLib.RouteDataParam memory routeDataParam = checkRouteData(userAccount, routeData);

    // 3 balance 
    // 当前合约balance已经包含msg.value,当前balance减去msg.value,再加上feeNative,才是最后的balance值
    uint256 finallyThisBalance;
    uint256 valueToCrossDelegate;
    (finallyThisBalance, valueToCrossDelegate) = calculBalances(routeDataParam);

    // 4 call CrossDelegate SC
    ICrossDelegateInterfaceV4(addrCrossDelegate).userLock{value: valueToCrossDelegate}(smgID, tokenPairID, value, userAccount);

    // 5 left balance
    transferLeftBalance(finallyThisBalance);

    // 6 format Event Data => emit Event
    emit CrossUserLock(routeDataParam.outReceiveAddr, routeDataParam.outTokenPairID, routeDataParam.routeInfo.feeAda, routeDataParam.routeInfo.feeNative, routeDataParam.constraintCBOR);
    return ;
  }

  // function  userBurn(bytes32 smgID, uint256 tokenPairID, uint256 value, uint256 fee, address tokenAccount, bytes userAccount)
  function crossUserBurn(bytes32 smgID, uint256 tokenPairID, uint256 value, uint256 fee, address tokenAccount, bytes calldata userAccount,
                        bytes calldata routeData)
    external
    payable
  {
    // 1 approve : tokenPairID => Erc20Token => approve
    checkAllowance(tokenAccount, value);

    // 2 userAccount(routeIn) => routeHelpSc => checkData(routeData)
    // routeData 跨回来的参数：outReceive/outTokenPairID/constraintCBOR
    BusinessDataLib.RouteDataParam memory routeDataParam = checkRouteData(userAccount, routeData);

    // 3 feeNative 本地原生币,扣除feeNative后的msg.value,才能给crossDelegate
    // 当前balance已经包含msg.value,当前balance减去msg.value,再加上feeNative,才是最后的balance值
    uint256 finallyThisBalance;
    uint256 valueToCrossDelegate;
    (finallyThisBalance, valueToCrossDelegate) = calculBalances(routeDataParam);

    // 4 call CrossDelegate SC
    ICrossDelegateInterfaceV4(addrCrossDelegate).userBurn{value: valueToCrossDelegate}(smgID, tokenPairID, value, fee, tokenAccount, userAccount);

    // 5 left balance
    transferLeftBalance(finallyThisBalance);

    // 6 format Event Data => emit Event
    emit CrossUserBurn(routeDataParam.outReceiveAddr, routeDataParam.outTokenPairID, routeDataParam.routeInfo.feeAda, routeDataParam.routeInfo.feeNative, routeDataParam.constraintCBOR);
  }

  function transferTo(address toAddr, uint256 amount) external onlyRole(TRANSFER_ADMIN_ROLE){
    require(toAddr != address(0), "toAddr is zero");
    uint256 curBalance = address(this).balance;
    require(curBalance >= amount, "amount > curBalance");
    payable(toAddr).transfer(amount);

    emit TransferTo(toAddr, amount);
  }

  ///***************************************************************************************
  ///***************************************************************************************

  function transferLeftBalance(uint256 finallyThisBalance) internal
  {
    bool bMath;
    uint256 currentThisBalance = address(this).balance;
    (bMath, currentThisBalance) = currentThisBalance.trySub(finallyThisBalance);
    require(bMath == true, "balance left error");

    // 5 msg.value
    if(currentThisBalance > 0) {
      payable(msg.sender).transfer(currentThisBalance);
    }
  }

  function calculBalances(BusinessDataLib.RouteDataParam memory routeDataParam) 
    internal 
    returns (uint256 , uint256 )
  {
    // 当前balance已经包含msg.value,当前balance减去msg.value,再加上feeNative,才是最后的balance值
    uint256 finallyThisBalance = address(this).balance;
    bool bMath;
    (bMath, finallyThisBalance) = finallyThisBalance.trySub(msg.value);
    require(bMath == true, "balance sub msg.value error");

    (bMath, finallyThisBalance) = finallyThisBalance.tryAdd(routeDataParam.routeInfo.feeNative);
    require(bMath == true, "balance add feeNative error");

    uint256 valueToCrossDelegate;
    (bMath, valueToCrossDelegate) = msg.value.trySub(routeDataParam.routeInfo.feeNative);
    require(bMath == true, "msg.value sub feeNative error");

    return (finallyThisBalance, valueToCrossDelegate);
  }

  function checkRouteData(bytes calldata userAccount, bytes calldata routeData) internal returns (BusinessDataLib.RouteDataParam memory)
  {
    address outReceiveAddr;
    uint256 outTokenPairID;
    bytes memory constraintCBOR;
    (outReceiveAddr, outTokenPairID, constraintCBOR) = abi.decode(routeData, (address, uint256, bytes));

    BusinessDataLib.RouteInfo memory routeInfo = mapRouteInfo[userAccount];
    require(routeInfo.businessAddr != address(0), "businessAddr not set");
    require(msg.value >= routeInfo.feeNative, "msg.value < feeNative");

    require(IBusinessInterface(routeInfo.businessAddr).checkBusinessData(constraintCBOR) == true, "check constraintCBOR error");
        
    BusinessDataLib.RouteDataParam memory routeDataParam = BusinessDataLib.RouteDataParam(
      {
        outReceiveAddr : outReceiveAddr,
        outTokenPairID : outTokenPairID,
        constraintCBOR : constraintCBOR,
        routeInfo : routeInfo
      }
    );
    return routeDataParam;
  }

  function checkAllowanceByToknePairID(uint256 tokenPairID, uint256 value) internal 
  {
    uint256 fromChainID;
    uint256 toChainID;
    bytes memory fromTokenAccount;
    bytes memory toTokenAccount;

    // 根据当前规则,只有从最初发行链跨向其他链才是userLock,否则都是userBurn,因此直接使用fromTokenAccount即可
    (fromChainID,fromTokenAccount,toChainID,toTokenAccount) = ITokenManager(addrTokenManager).getTokenPairInfo(tokenPairID);
    address tokenScAddr = bytesToAddress(fromTokenAccount);
    if(tokenScAddr != address(0)) {
      checkAllowance(tokenScAddr, value);// token 才需要检查 allowance
    }
  }

  function checkAllowance(address tokenAccount, uint256 value) 
    internal
    returns ( bool )
  {
    IERC20(tokenAccount).safeTransferFrom(msg.sender, address(this), value);

    uint256 allowance = IERC20(tokenAccount).allowance(address(this), addrCrossDelegate);
    if(allowance == 0) {
      require(IERC20(tokenAccount).approve(addrCrossDelegate, type(uint256).max), "approval max_value failed");
    }
    else if(allowance < value) {
      require(IERC20(tokenAccount).approve(addrCrossDelegate, 0), "approval 0 failed");
      require(IERC20(tokenAccount).approve(addrCrossDelegate, type(uint256).max), "approval max_value failed");
    }

    return true;
  }

  function bytesToAddress(bytes memory b) internal pure returns (address addr) {
    assembly {
      addr := mload(add(b,20))
    }
  }

}
