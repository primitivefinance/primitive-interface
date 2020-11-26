import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, AppState } from '../index'
import { Contract } from '@ethersproject/contracts'

import { initialState } from './reducer'
import { removeItem, updateItem } from './actions'

import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import ethers, { BigNumberish, BigNumber } from 'ethers'
import { Token, TokenAmount, Pair } from '@uniswap/sdk'

import { OptionsAttributes } from '../options/reducer'
import {
  DEFAULT_DEADLINE,
  DEFAULT_TIMELIMIT,
  STABLECOINS,
  DEFAULT_ALLOWANCE,
} from '@/constants/index'

import { UNISWAP_FACTORY_V2 } from '@/lib/constants'
import { UNISWAP_ROUTER02_V2 } from '@/lib/constants'
import { Option, createOptionEntityWithAddress } from '@/lib/entities/option'
import { parseEther } from 'ethers/lib/utils'
import { Asset, Trade, Quantity } from '@/lib/entities'
import { Trader } from '@/lib/trader'
import { Uniswap } from '@/lib/uniswap'
import { TradeSettings, SinglePositionParameters } from '@/lib/types'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import useTokenAllowance, {
  useGetTokenAllowance,
} from '@/hooks/useTokenAllowance'
import { Operation, UNISWAP_CONNECTOR } from '@/constants/index'
import { useReserves } from '@/hooks/data'
import executeTransaction, {
  checkAllowance,
  executeApprove,
} from '@/lib/utils/executeTransaction'

import { useSlippage } from '@/hooks/user'
import { useBlockNumber } from '@/hooks/data'
import { useTransactionAdder } from '@/state/transactions/hooks'
import { useAddNotif } from '@/state/notifs/hooks'

export const useItem = (): {
  item: OptionsAttributes
  orderType: Operation
  loading: boolean
  approved: boolean
  lpApproved: boolean
  checked: boolean
} => {
  const state = useSelector<AppState, AppState['order']>((state) => state.order)
  return state
}

export const useUpdateItem = (): ((
  item: OptionsAttributes,
  orderType: Operation,
  lpPair?: Pair
) => void) => {
  const { chainId } = useWeb3React()
  const dispatch = useDispatch<AppDispatch>()
  const getAllowance = useGetTokenAllowance()
  return useCallback(
    async (item: OptionsAttributes, orderType: Operation, lpPair?: Pair) => {
      let approved = false
      let lpApproved = false
      const underlyingToken: Token = new Token(
        item.entity.chainId,
        item.entity.assetAddresses[0],
        18,
        item.entity.isPut ? 'DAI' : item.asset.toUpperCase()
      )
      console.log(Operation[orderType])
      if (orderType === Operation.NONE) {
        console.log('NOPE')
        dispatch(
          updateItem({
            item,
            orderType,
            loading: false,
            approved: false,
            lpApporved: false,
          })
        )
        return
      } else {
        if (
          orderType === Operation.ADD_LIQUIDITY ||
          orderType === Operation.REMOVE_LIQUIDITY_CLOSE
        ) {
          const spender = UNISWAP_CONNECTOR[chainId]
          if (orderType === Operation.ADD_LIQUIDITY) {
            const tokenAllowance = await getAllowance(
              item.entity.assetAddresses[0],
              spender
            )
            approved = parseEther(tokenAllowance).gt(parseEther('0'))
            dispatch(
              updateItem({
                item,
                orderType,
                loading: false,
                approved,
                lpApproved,
              })
            )
            return
          }
          if (orderType === Operation.REMOVE_LIQUIDITY_CLOSE) {
            const lpToken = lpPair.liquidityToken.address
            const optionAllowance = await getAllowance(item.address, spender)
            approved = parseEther(optionAllowance).gt(parseEther('0'))
            const lpAllowance = await getAllowance(lpToken, spender)
            lpApproved = parseEther(lpAllowance).gt(parseEther('0'))
            dispatch(
              updateItem({
                item,
                orderType,
                loading: false,
                approved,
                lpApproved,
              })
            )
            return
          }
        } else {
          const spender =
            orderType === Operation.CLOSE_SHORT || orderType === Operation.SHORT
              ? UNISWAP_ROUTER02_V2
              : UNISWAP_CONNECTOR[chainId]
          let tokenAddress
          switch (orderType) {
            case Operation.LONG:
              tokenAddress = underlyingToken.address
              break
            case Operation.SHORT:
              tokenAddress = underlyingToken.address
              break
            case Operation.CLOSE_LONG:
              tokenAddress = item.entity.address
              break
            case Operation.CLOSE_SHORT:
              tokenAddress = item.entity.assetAddresses[2]
              break
            default:
              break
          }
          const tokenAllowance = await getAllowance(tokenAddress, spender)
          console.log(tokenAllowance)
          approved = parseEther(tokenAllowance).gt(parseEther('0'))
          console.log(approved)
          lpApproved = false
          dispatch(
            updateItem({
              item,
              orderType,
              loading: false,
              approved,
              lpApproved,
            })
          )
          return
        }
      }
    },
    [dispatch, chainId, updateItem]
  )
}

export const useRemoveItem = (): (() => void) => {
  const dispatch = useDispatch<AppDispatch>()

  return useCallback(() => {
    dispatch(removeItem())
  }, [dispatch])
}
export const useHandleSubmitOrder = (): ((
  provider: Web3Provider,
  optionAddress: string,
  quantity: number,
  operation: Operation,
  secondaryQuantity?: number
) => void) => {
  const dispatch = useDispatch<AppDispatch>()
  const addTransaction = useTransactionAdder()
  const { item } = useItem()
  const { chainId, account } = useWeb3React()
  const [slippage] = useSlippage()
  const { data } = useBlockNumber()
  const throwError = useAddNotif()
  const now = () => new Date().getTime()

  return useCallback(
    async (
      provider: Web3Provider,
      optionAddress: string,
      quantity: number,
      operation: Operation,
      secondaryQuantity?: number
    ) => {
      const signer: ethers.Signer = await provider.getSigner()
      const tradeSettings: TradeSettings = {
        slippage: slippage,
        timeLimit: DEFAULT_TIMELIMIT,
        receiver: account,
        deadline: DEFAULT_DEADLINE,
        stablecoin: STABLECOINS[chainId].address,
      }

      const optionEntity: Option = createOptionEntityWithAddress(
        chainId,
        optionAddress
      )
      const inputAmount: Quantity = new Quantity(
        new Asset(18), // fix with actual metadata
        parseEther(quantity.toString())
      )
      const outputAmount: Quantity = new Quantity(
        new Asset(18), // fix with actual metadata
        '0'
      )
      const optionInstance: ethers.Contract = optionEntity.optionInstance(
        signer
      )
      const base: ethers.BigNumber = await optionInstance.getBaseValue()
      const quote: ethers.BigNumber = await optionInstance.getQuoteValue()
      const assetAddresses: string[] = await optionInstance.getAssetAddresses()
      optionEntity.setAssetAddresses(assetAddresses)
      optionEntity.optionParameters.base = new Quantity(new Asset(18), base)
      optionEntity.optionParameters.quote = new Quantity(new Asset(18), quote)

      const path: string[] = []
      const amountsIn: BigNumberish[] = []
      let amountsOut: BigNumberish[] = []
      const reserves: BigNumberish[] = []
      let totalSupply: BigNumberish
      const trade: Trade = new Trade(
        optionEntity,
        inputAmount,
        outputAmount,
        path,
        reserves,
        totalSupply,
        amountsIn,
        amountsOut,
        operation,
        signer
      )

      const factory = new ethers.Contract(
        UNISWAP_FACTORY_V2,
        UniswapV2Factory.abi,
        signer
      )
      // type SinglePositionParameters fails due to difference in Trader and Uniswap type
      let transaction: any
      switch (operation) {
        case Operation.LONG:
          // For this operation, the user borrows underlyingTokens to use to mint redeemTokens, which are then returned to the pair.
          // This is effectively a swap from redeemTokens to underlyingTokens, but it occurs in the reverse order.
          trade.path = [
            assetAddresses[2], // redeem
            assetAddresses[0], // underlying
          ]
          // The amountsOut[1] will tell us how much of the flash loan of underlyingTokens is outstanding.
          trade.amountsOut = await trade.getAmountsOut(
            signer,
            factory,
            inputAmount.quantity,
            trade.path
          )
          // With the Pair's reserves, we can calculate all values using pure functions, including the premium.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.SHORT:
          // Going SHORT on an option effectively means holding the SHORT OPTION TOKENS.
          // Purchase them for underlyingTokens from the underlying<>redeem UniswapV2Pair.
          trade.path = [
            assetAddresses[0], // underlying
            assetAddresses[2], // redeem
          ]
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          amountsOut = await trade.getAmountsOut(
            signer,
            factory,
            trade.inputAmount.quantity,
            trade.path
          )
          trade.outputAmount.quantity = amountsOut[1]
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.CLOSE_LONG:
          // On the UI, the user inputs the quantity of LONG OPTIONS they want to close.
          // Calling the function on the contract requires the quantity of SHORT OPTIONS being borrowed to close.
          // Need to calculate how many SHORT OPTIONS are needed to close the desired quantity of LONG OPTIONS.
          const redeemAmount = ethers.BigNumber.from(inputAmount.quantity)
            .mul(quote)
            .div(base)
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            assetAddresses[0], // underlying
            assetAddresses[2], // redeem
          ]
          // The amountIn[0] will tell how many underlyingTokens are needed for the borrowed amount of redeemTokens.
          trade.amountsIn = await trade.getAmountsIn(
            signer,
            factory,
            redeemAmount,
            trade.path
          )
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          // The actual function will take the redeemQuantity rather than the optionQuantity.
          trade.inputAmount.quantity = redeemAmount
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.CLOSE_SHORT:
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            assetAddresses[2], // redeem
            assetAddresses[0], // underlying
          ]
          // The amountIn[0] will tell how many underlyingTokens are needed for the borrowed amount of redeemTokens.
          trade.amountsOut = await trade.getAmountsOut(
            signer,
            factory,
            trade.inputAmount.quantity,
            trade.path
          )
          // The actual function will take the redeemQuantity rather than the optionQuantity.
          trade.outputAmount.quantity = trade.amountsOut[1]
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.ADD_LIQUIDITY:
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            assetAddresses[2], // redeem
            assetAddresses[0], // underlying
          ]
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )

          // The actual function will take the redeemQuantity rather than the optionQuantity.
          trade.outputAmount = new Quantity(
            new Asset(18), // fix with actual metadata
            parseEther(secondaryQuantity ? secondaryQuantity.toString() : '0')
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.REMOVE_LIQUIDITY:
          trade.path = [
            assetAddresses[2], // redeem
            assetAddresses[0], // underlying
          ]
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          trade.totalSupply = await trade.getTotalSupply(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          transaction.tokensToApprove = [
            await factory.getPair(trade.path[0], trade.path[1]),
          ] // need to approve LP token
          break
        case Operation.REMOVE_LIQUIDITY_CLOSE:
          trade.path = [
            assetAddresses[2], // redeem
            assetAddresses[0], // underlying
          ]
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          trade.totalSupply = await trade.getTotalSupply(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          transaction.tokensToApprove = [
            await factory.getPair(trade.path[0], trade.path[1]),
            trade.option.address,
          ] // need to approve LP token
          break
        default:
          transaction = Trader.singleOperationCallParameters(
            trade,
            tradeSettings
          )
          break
      }

      executeTransaction(signer, transaction)
        .then((tx) => {
          if (tx.hash) {
            addTransaction(
              {
                summary: {
                  type: Operation[operation].toString(),
                  option: item.entity,
                  amount: quantity,
                },
                hash: tx.hash,
                addedTime: now(),
                from: account,
              },
              operation
            )
          }
        })
        .catch((err) => {
          throwError(0, '', `${err.message}`, '')
        })
    },
    [dispatch, account, addTransaction]
  )
}
