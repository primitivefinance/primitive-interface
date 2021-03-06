import ethers, { BigNumberish } from 'ethers'
import { useCallback, useEffect, useState, useRef } from 'react'
import { Web3Provider } from '@ethersproject/providers'

import {
  DEFAULT_DEADLINE,
  DEFAULT_TIMELIMIT,
  STABLECOINS,
  ADDRESS_ZERO,
} from '@/constants/index'
import { Operation } from '@primitivefi/sdk'
import { FACTORY_ADDRESS } from '@sushiswap/sdk'
import { Option, EMPTY_ASSET } from '@primitivefi/sdk'
import { parseEther } from 'ethers/lib/utils'
import { Trade, Venue } from '@primitivefi/sdk'
import { SushiSwap, Trader, Protocol } from '@primitivefi/sdk'
import { TradeSettings } from '@primitivefi/sdk'
import UniswapV2Factory from '@uniswap/v2-core/build/UniswapV2Factory.json'
import { useTradeSettings } from '@/hooks/user'

import useOptionEntities, { OptionEntities } from '@/hooks/useOptionEntities'
import { useTransactionAdder } from '@/state/transactions/hooks'
import { useItem } from '@/state/order/hooks'

import { Token, TokenAmount } from '@sushiswap/sdk'

import { useWeb3React } from '@web3-react/core'
import { useSlippage } from '@/state/user/hooks'
import { useBlockNumber } from '@/hooks/data'
import { useAddNotif } from '@/state/notifs/hooks'
import { getTotalSupply } from '@primitivefi/sdk'

const EMPTY_TOKEN: Token = new Token(1, ADDRESS_ZERO, 18)

const getTrade = async (
  provider: Web3Provider,
  parsedAmountA: BigInt,
  operation: Operation,
  parsedAmountB?: BigInt
) => {
  const { item } = useItem()
  const { chainId, account } = useWeb3React()
  const slippage = useSlippage()
  const { data } = useBlockNumber()
  const throwError = useAddNotif()
  const now = () => new Date().getTime()
  const optionEntity: Option = item.entity
  const signer: ethers.Signer = await provider.getSigner()
  const tradeSettings: TradeSettings = {
    slippage: slippage,
    timeLimit: DEFAULT_TIMELIMIT,
    receiver: account,
    deadline: DEFAULT_DEADLINE,
    stablecoin: STABLECOINS[chainId].address,
  }

  const totalSupply: BigNumberish = await getTotalSupply(
    provider,
    item.market.liquidityToken.address
  )

  //console.log(parseInt(parsedAmountA) * 1000000000000000000)
  const inputAmount: TokenAmount = new TokenAmount(
    EMPTY_TOKEN, // fix with actual metadata
    BigInt(parsedAmountA.toString()).toString()
  )
  const outputAmount: TokenAmount = new TokenAmount(
    EMPTY_TOKEN, // fix with actual metadata
    BigInt(parsedAmountB.toString()).toString()
  )

  let out: BigNumberish
  const path: string[] = []
  const amountsIn: BigNumberish[] = []
  const amountsOut: BigNumberish[] = []
  const reserves: BigNumberish[] = []

  const trade: Trade = new Trade(
    optionEntity,
    item.market,
    totalSupply,
    inputAmount,
    outputAmount,
    operation,
    Venue.UNISWAP,
    signer,
    null
  )
  const factory = new ethers.Contract(
    FACTORY_ADDRESS[chainId],
    UniswapV2Factory.abi,
    signer
  )
  // type SinglePositionParameters fails due to difference in Trader and Uniswap type
  let transaction: any
  switch (operation) {
    case Operation.LONG:
      // Need to borrow exact amount of underlyingTokens, so exact output needs to be the parsedAmount.
      // path: redeem -> underlying, getInputAmount is the redeem cost
      trade.inputAmount = new TokenAmount(optionEntity.redeem, '0')
      trade.outputAmount = new TokenAmount(
        optionEntity.underlying,
        parsedAmountA.toString()
      )
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
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
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.CLOSE_LONG:
      // Path: underlying -> redeem, exact redeem amount is outputAmount.
      trade.outputAmount = new TokenAmount(
        optionEntity.redeem,
        optionEntity.proportionalShort(parsedAmountA.toString()).toString()
      )
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.CLOSE_SHORT:
      trade.inputAmount = new TokenAmount(
        optionEntity.redeem,
        parsedAmountA.toString()
      )
      trade.outputAmount = trade.market.getOutputAmount(trade.inputAmount)[0]

      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.ADD_LIQUIDITY:
      // primary input is the options deposit (underlying tokens)
      trade.inputAmount = new TokenAmount(
        optionEntity,
        parsedAmountA.toString()
      )
      // secondary input is the underlyings deposit
      trade.outputAmount = new TokenAmount(
        optionEntity.underlying,
        parsedAmountB.toString()
      )

      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.ADD_LIQUIDITY_CUSTOM:
      // primary input is the options deposit (underlying tokens)
      trade.inputAmount = new TokenAmount(
        optionEntity.redeem,
        parsedAmountA.toString()
      )
      // secondary input is the underlyings deposit
      trade.outputAmount = new TokenAmount(
        optionEntity.underlying,
        parsedAmountB.toString()
      )
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.REMOVE_LIQUIDITY:
      trade.inputAmount = new TokenAmount(
        optionEntity.redeem,
        parsedAmountA.toString()
      )
      trade.outputAmount = new TokenAmount(
        optionEntity.underlying,
        parsedAmountB.toString()
      )
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    case Operation.REMOVE_LIQUIDITY_CLOSE:
      trade.inputAmount = new TokenAmount(
        optionEntity.redeem,
        parsedAmountA.toString()
      )
      trade.outputAmount = new TokenAmount(
        optionEntity.underlying,
        parsedAmountB.toString()
      )
      transaction = SushiSwap.singlePositionCallParameters(trade, tradeSettings)
      break
    default:
      transaction = Trader.singleOperationCallParameters(trade, tradeSettings)
      break
  }

  return trade
}

const useTradeInfo = () => {
  const [trade, setTrade] = useState<Trade>()
  const { library } = useWeb3React()
  const { item, orderType } = useItem()
  const optionEntities = useOptionEntities([item.entity.address])
  const tradeSettings = useTradeSettings()

  const fetchTrade = useCallback(async () => {
    if (
      library &&
      typeof optionEntities !== 'undefined' &&
      item &&
      orderType &&
      tradeSettings
    ) {
      const tradeInfo = await getTrade(library, BigInt(1), orderType, BigInt(1))
      if (tradeInfo) {
        setTrade(tradeInfo)
      }
    }
  }, [library, orderType, item, tradeSettings, optionEntities, getTrade])

  useEffect(() => {
    if (
      library &&
      typeof optionEntities !== 'undefined' &&
      item &&
      orderType &&
      tradeSettings
    ) {
      fetchTrade()
      const refreshInterval = setInterval(fetchTrade, 10000000000)
      return () => clearInterval(refreshInterval)
    }
  }, [library, orderType, setTrade, item, tradeSettings, fetchTrade])

  return trade
}

export default useTradeInfo
