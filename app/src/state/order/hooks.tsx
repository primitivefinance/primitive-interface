import { useCallback, useMemo } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, AppState } from '../index'

import { removeItem, updateItem } from './actions'

import { useWeb3React } from '@web3-react/core'
import { Web3Provider } from '@ethersproject/providers'
import ethers, { BigNumberish, BigNumber } from 'ethers'
import numeral from 'numeral'
import { Token, TokenAmount, Pair, JSBI, BigintIsh } from '@uniswap/sdk'
import { OptionsAttributes } from '../options/actions'
import {
  DEFAULT_DEADLINE,
  DEFAULT_TIMELIMIT,
  STABLECOINS,
  DEFAULT_ALLOWANCE,
  ADDRESS_ZERO,
} from '@/constants/index'

import { UNISWAP_FACTORY_V2 } from '@/lib/constants'
import { UNISWAP_ROUTER02_V2 } from '@/lib/constants'
import { Option, createOptionEntityWithAddress } from '@/lib/entities/option'
import { parseEther, formatEther } from 'ethers/lib/utils'
import { Trade } from '@/lib/entities'
import { Trader } from '@/lib/trader'
import { Uniswap } from '@/lib/uniswap'
import { TradeSettings, SinglePositionParameters } from '@/lib/types'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import useTokenAllowance, {
  useGetTokenAllowance,
} from '@/hooks/useTokenAllowance'
import { Operation, UNISWAP_CONNECTOR, TRADER } from '@/constants/index'
import { useReserves } from '@/hooks/data'
import executeTransaction, {
  checkAllowance,
  executeApprove,
} from '@/lib/utils/executeTransaction'

import { useSlippage } from '@/hooks/user'
import { useBlockNumber } from '@/hooks/data'
import { useTransactionAdder } from '@/state/transactions/hooks'
import { useAddNotif } from '@/state/notifs/hooks'
import { useClearSwap } from '@/state/swap/hooks'
import { useClearLP } from '@/state/liquidity/hooks'

const EMPTY_TOKEN: Token = new Token(1, ADDRESS_ZERO, 18)

export const useItem = (): {
  item: OptionsAttributes
  orderType: Operation
  loading: boolean
  approved: boolean[]
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
  const clear = useClearSwap()
  const clearLP = useClearLP()
  return useCallback(
    async (item: OptionsAttributes, orderType: Operation, lpPair?: Pair) => {
      let manage = false
      switch (orderType) {
        case Operation.MINT:
          manage = true
          break
        case Operation.EXERCISE:
          manage = true
          break
        case Operation.REDEEM:
          manage = true
          break
        case Operation.CLOSE:
          manage = true
          break
        default:
          break
      }
      if (orderType === Operation.NONE) {
        clear()
        clearLP()
        dispatch(
          updateItem({
            item,
            orderType,
            loading: false,
            approved: [false, false],
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
              item.entity.underlying.address,
              spender
            )
            dispatch(
              updateItem({
                item,
                orderType,
                loading: false,
                approved: [
                  parseEther(tokenAllowance).gt(parseEther('0')),
                  false,
                ],
              })
            )
            return
          }
          if (orderType === Operation.REMOVE_LIQUIDITY_CLOSE && lpPair) {
            const lpToken = lpPair.liquidityToken.address
            const optionAllowance = await getAllowance(
              item.entity.address,
              spender
            )
            const lpAllowance = await getAllowance(lpToken, spender)
            dispatch(
              updateItem({
                item,
                orderType,
                loading: false,
                approved: [
                  parseEther(optionAllowance).gt(parseEther('0')),
                  parseEther(lpAllowance).gt(parseEther('0')),
                ],
              })
            )
            return
          }
        } else if (manage) {
          let tokenAddress
          let secondaryAddress
          switch (orderType) {
            case Operation.MINT:
              tokenAddress = item.entity.underlying.address
              break
            case Operation.EXERCISE:
              tokenAddress = item.entity.address
              secondaryAddress = item.entity.strike.address
              break
            case Operation.REDEEM:
              tokenAddress = item.entity.redeem.address
              break
            case Operation.CLOSE:
              tokenAddress = item.entity.address
              secondaryAddress = item.entity.redeem.address
              break
            default:
              break
          }
          const spender = TRADER[chainId]
          const tokenAllowance = await getAllowance(tokenAddress, spender)
          let secondaryAllowance = '0'
          if (secondaryAddress) {
            secondaryAllowance = await getAllowance(secondaryAddress, spender)
          }
          dispatch(
            updateItem({
              item,
              orderType,
              loading: false,
              approved: [
                parseEther(tokenAllowance).gt(parseEther('0')),
                parseEther(secondaryAllowance).gt(parseEther('0')),
              ],
            })
          )
          return
        } else {
          const spender =
            orderType === Operation.CLOSE_SHORT || orderType === Operation.SHORT
              ? UNISWAP_ROUTER02_V2
              : UNISWAP_CONNECTOR[chainId]
          let tokenAddress
          let secondaryAddress
          switch (orderType) {
            case Operation.LONG:
              tokenAddress = item.entity.underlying.address
              break
            case Operation.SHORT:
              tokenAddress = item.entity.underlying.address
              break
            case Operation.WRITE:
              tokenAddress = item.entity.address
              secondaryAddress = item.entity.underlying.address
              break
            case Operation.CLOSE_LONG:
              tokenAddress = item.entity.address
              break
            case Operation.CLOSE_SHORT:
              tokenAddress = item.entity.redeem.address
              break
            default:
              tokenAddress = item.entity.underlying.address
              break
          }
          const tokenAllowance = await getAllowance(tokenAddress, spender)
          let secondaryAllowance
          if (secondaryAddress) {
            secondaryAllowance = await getAllowance(secondaryAddress, spender)
          } else {
            secondaryAllowance = '0'
          }
          dispatch(
            updateItem({
              item,
              orderType,
              loading: false,
              approved: [
                parseEther(tokenAllowance).gt(parseEther('0')),
                parseEther(secondaryAllowance).gt(parseEther('0')),
              ],
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
  parsedAmountA: BigInt,
  operation: Operation,
  parsedAmountB?: BigInt
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
      parsedAmountA: BigInt,
      operation: Operation,
      parsedAmountB?: BigInt
    ) => {
      const optionEntity: Option = item.entity
      const signer: ethers.Signer = await provider.getSigner()
      const tradeSettings: TradeSettings = {
        slippage: slippage,
        timeLimit: DEFAULT_TIMELIMIT,
        receiver: account,
        deadline: DEFAULT_DEADLINE,
        stablecoin: STABLECOINS[chainId].address,
      }

      //console.log(parseInt(parsedAmountA) * 1000000000000000000)
      const inputAmount: TokenAmount = new TokenAmount(
        EMPTY_TOKEN, // fix with actual metadata
        BigInt(parsedAmountA.toString()).toString()
      )
      const outputAmount: TokenAmount = new TokenAmount(
        EMPTY_TOKEN, // fix with actual metadata
        '0'
      )

      let out: BigNumberish
      const path: string[] = []
      const amountsIn: BigNumberish[] = []
      let amountsOut: BigNumberish[] = []
      const reserves: BigNumberish[] = []
      let totalSupply: BigNumberish
      const trade: Trade = new Trade(
        optionEntity,
        item.market,
        inputAmount,
        outputAmount,
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
          trade.inputAmount = new TokenAmount(
            optionEntity.redeem,
            parsedAmountA.toString()
          )
          trade.outputAmount = new TokenAmount(optionEntity.underlying, '0')
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.SHORT:
          // Going SHORT on an option effectively means holding the SHORT OPTION TOKENS.
          // Purchase them for underlyingTokens from the underlying<>redeem UniswapV2Pair.
          // exact output means our input is what we need to solve for
          trade.outputAmount = new TokenAmount(
            optionEntity.redeem,
            parsedAmountA.toString()
          )
          trade.inputAmount = trade.market.getInputAmount(trade.outputAmount)[0]
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.WRITE:
          trade.inputAmount = new TokenAmount(
            optionEntity.underlying,
            parsedAmountA.toString()
          )
          trade.outputAmount = new TokenAmount(
            optionEntity.redeem,
            optionEntity.proportionalShort(parsedAmountA.toString()).toString()
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.CLOSE_LONG:
          // On the UI, the user inputs the parsedAmountA of LONG OPTIONS they want to close.
          // Calling the function on the contract requires the parsedAmountA of SHORT OPTIONS being borrowed to close.
          // Need to calculate how many SHORT OPTIONS are needed to close the desired parsedAmountA of LONG OPTIONS.
          const redeemAmount = optionEntity.proportionalShort(
            inputAmount.raw.toString()
          )
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            optionEntity.underlying.address, // underlying
            optionEntity.redeem.address, // redeem
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
          trade.inputAmount = new TokenAmount(
            EMPTY_TOKEN,
            redeemAmount.toString()
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.CLOSE_SHORT:
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            optionEntity.redeem.address, // redeem
            optionEntity.underlying.address, // underlying
          ]
          // The amountIn[0] will tell how many underlyingTokens are needed for the borrowed amount of redeemTokens.
          trade.amountsOut = await trade.getAmountsOut(
            signer,
            factory,
            trade.inputAmount.raw.toString(),
            trade.path
          )
          // The actual function will take the redeemQuantity rather than the optionQuantity.
          trade.outputAmount = new TokenAmount(
            EMPTY_TOKEN,
            trade.amountsOut[1].toString()
          )
          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.ADD_LIQUIDITY:
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            optionEntity.redeem.address, // redeem
            optionEntity.underlying.address, // underlying
          ]
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          // The actual function will take the redeemQuantity rather than the optionQuantity.
          out =
            parsedAmountB !== BigInt('0')
              ? BigNumber.from(parsedAmountB.toString())
              : BigNumber.from('0')

          console.log(out.toString())
          trade.outputAmount = new TokenAmount(
            EMPTY_TOKEN, // fix with actual metadata
            out.toString()
          )

          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.ADD_LIQUIDITY_CUSTOM:
          // This function borrows redeem tokens and pays back in underlying tokens. This is a normal swap
          // with the path of underlyingTokens to redeemTokens.
          trade.path = [
            optionEntity.redeem.address, // redeem
            optionEntity.underlying.address, // underlying
          ]
          // Get the reserves here because we have the web3 context. With the reserves, we can calulcate all token outputs.
          trade.reserves = await trade.getReserves(
            signer,
            factory,
            trade.path[0],
            trade.path[1]
          )
          // The actual function will take the redeemQuantity rather than the optionQuantity.
          out =
            parsedAmountB !== BigInt('0')
              ? BigNumber.from(parsedAmountB.toString())
              : BigNumber.from('0')

          trade.outputAmount = new TokenAmount(
            EMPTY_TOKEN, // fix with actual metadata
            out.toString()
          )

          transaction = Uniswap.singlePositionCallParameters(
            trade,
            tradeSettings
          )
          break
        case Operation.REMOVE_LIQUIDITY:
          trade.path = [
            optionEntity.redeem.address, // redeem
            optionEntity.underlying.address, // underlying
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
            optionEntity.redeem.address, // redeem
            optionEntity.underlying.address, // underlying
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
      console.log(trade)
      executeTransaction(signer, transaction)
        .then((tx) => {
          if (tx.hash) {
            addTransaction(
              {
                summary: {
                  type: Operation[operation].toString(),
                  option: item.entity,
                  amount: numeral(
                    parseInt(formatEther(parsedAmountA.toString()))
                  )
                    .format('0.00(a)')
                    .toString(),
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
          throwError(0, 'Order Error', `${err.message}`, '')
        })
    },
    [dispatch, account, addTransaction]
  )
}
