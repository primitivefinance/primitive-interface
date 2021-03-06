import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/router'

import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, AppState } from '../index'
import { updateOptions, OptionsAttributes, clearOptions } from './actions'
import { OptionsState } from './reducer'

import { Pair, Token, TokenAmount } from '@sushiswap/sdk'
import * as SushiSwapSDK from '@sushiswap/sdk'
import ethers, { BigNumberish, BigNumber } from 'ethers'

import {
  Protocol,
  Option,
  SushiSwapMarket,
  Venue,
  TEST_OPTIONS,
} from '@primitivefi/sdk'

import { useActiveWeb3React } from '@/hooks/user/index'
import { useAddNotif } from '@/state/notifs/hooks'
import { STABLECOINS } from '@/constants/index'
import { optionAddresses } from '@/constants/options'
import { testAddresses } from '../../constants/options'
const { ChainId } = SushiSwapSDK

export const useOptions = (): OptionsState => {
  const state = useSelector<AppState, AppState['options']>(
    (state) => state.options
  )
  return state
}

export const useClearOptions = (): (() => void) => {
  const dispatch = useDispatch<AppDispatch>()
  return useCallback(() => {
    dispatch(clearOptions())
  }, [dispatch])
}

export const useUpdateOptions = (): ((
  assetName: string,
  venue: Venue,
  isLiquidity?: boolean,
  assetAddress?: string
) => void) => {
  const { library, chainId, active } = useActiveWeb3React()
  const addNotif = useAddNotif()
  const router = useRouter()
  const dispatch = useDispatch<AppDispatch>()
  const isTestnet = chainId === ChainId.RINKEBY || chainId === ChainId.KOVAN

  return useCallback(
    async (
      assetName: string,
      venue: Venue,
      isLiquidity?: boolean,
      assetAddress?: string
    ) => {
      const calls: OptionsAttributes[] = []
      const puts: OptionsAttributes[] = []
      const provider = library
      console.log(`loading options for ${assetName}`)
      setTimeout(() => {
        if (!provider) {
          console.log('system fail')
          return
        }
      }, 200)
      const key =
        assetName === '' || assetName === 'WETH'
          ? 'eth'
          : assetName.toLowerCase()
      let testAddresses
      if (TEST_OPTIONS[key]) {
        testAddresses = TEST_OPTIONS[key][chainId]?.map(
          (option) => option.address
        )
      }
      Protocol.getOptionsUsingMultiCall(
        chainId,
        isTestnet ? testAddresses : optionAddresses,
        provider
      )
        .then((optionEntitiesObject) => {
          const allKeys: string[] = Object.keys(optionEntitiesObject)
          const allPairAddresses: string[] = []
          const allTokensArray: string[][] = []
          for (let i = 0; i < allKeys.length; i++) {
            const key: string = allKeys[i]
            const option: Option = optionEntitiesObject[key]
            allPairAddresses.push(option.sushiswapPairAddress)
            allTokensArray.push([
              option.redeem.address,
              option.underlying.address,
            ])
          }
          Protocol.getPairsFromMultiCall(
            chainId,
            provider,
            allTokensArray,
            Venue.SUSHISWAP
          )
            .then((allPairsData) => {
              const actualPairs = []
              for (const pair of allPairsData) {
                if (pair !== ethers.constants.AddressZero) {
                  actualPairs.push(pair)
                }
              }
              Protocol.getReservesFromMultiCall(provider, actualPairs)
                .then((allReservesData) => {
                  const allPackedReserves: any = []
                  for (let t = 0; t < allReservesData.length / 3; t++) {
                    const startIndex = t * 3
                    const firstItem: string[] = allReservesData[startIndex]
                    const secondItem: string = allReservesData[startIndex + 1]
                    const thirdItem: string = allReservesData[startIndex + 2]
                    allPackedReserves.push([firstItem, secondItem, thirdItem])
                  }

                  const pairReserveTotal = [
                    BigNumber.from(0),
                    BigNumber.from(0),
                  ]
                  for (let i = 0; i < allKeys.length; i++) {
                    const key: string = allKeys[i]
                    const option: Option = optionEntitiesObject[key]
                    let index = 0
                    let reserves: string[] = ['0', '0']
                    let pairDataItem: string[]
                    for (const packed of allPackedReserves) {
                      index = packed.indexOf(option.redeem.address)
                      if (index !== -1) {
                        reserves = packed[0]
                        pairDataItem = packed
                      }
                    }

                    if (typeof reserves === 'undefined') reserves = ['0', '0']

                    let token0: string = option.underlying.address
                    let token1: string = option.redeem.address
                    if (typeof pairDataItem !== 'undefined') {
                      token0 = pairDataItem[1]
                      token1 = pairDataItem[2]
                    }

                    const underlyingAddress = option.underlying.address
                    const redeemAddress = option.redeem.address
                    let underlyingTokenAmount: TokenAmount
                    let redeemTokenAmount: TokenAmount
                    if (
                      token0 === underlyingAddress &&
                      token1 === redeemAddress
                    ) {
                      underlyingTokenAmount = new TokenAmount(
                        option.underlying,
                        reserves[0]
                      )
                      redeemTokenAmount = new TokenAmount(
                        option.redeem,
                        reserves[1]
                      )
                    } else {
                      redeemTokenAmount = new TokenAmount(
                        option.redeem,
                        reserves[0]
                      )
                      underlyingTokenAmount = new TokenAmount(
                        option.underlying,
                        reserves[1]
                      )
                    }

                    const pairType = SushiSwapSDK.Pair
                    const pair: Pair | SushiSwapSDK.Pair = new pairType(
                      underlyingTokenAmount,
                      redeemTokenAmount
                    )
                    option.setPair(pair)

                    const marketType = SushiSwapMarket

                    const market: SushiSwapMarket = new marketType(
                      option,
                      underlyingTokenAmount,
                      redeemTokenAmount
                    )

                    const underlyingReserve = option.pair
                      .reserveOf(option.underlying)
                      .raw.toString()

                    if (option.isCall) {
                      if (isLiquidity) {
                        if (
                          ((option.baseValue.token.symbol.toUpperCase() ===
                            'SUSHI' ||
                            option.baseValue.token.symbol.toUpperCase() ===
                              'WETH') &&
                            (option.strikePrice === '5000' ||
                              option.strikePrice === '30')) ||
                          isTestnet
                        ) {
                          pairReserveTotal[0] = pairReserveTotal[0].add(
                            BigNumber.from(underlyingReserve)
                          )
                          calls.push({
                            entity: option,
                            asset: assetName,
                            market: market,
                            id: option.name,
                            venue: Venue.SUSHISWAP,
                          })
                        }
                      } else {
                        if (
                          (option.baseValue.token.symbol.toUpperCase() ===
                            assetName.toUpperCase() &&
                            (option.strikePrice === '5000' ||
                              option.strikePrice === '30')) ||
                          isTestnet
                        ) {
                          pairReserveTotal[0] = pairReserveTotal[0].add(
                            BigNumber.from(underlyingReserve)
                          )
                          calls.push({
                            entity: option,
                            asset: assetName,
                            market: market,
                            id: option.name,
                            venue: Venue.SUSHISWAP,
                          })
                        }
                      }
                    } else {
                      if (isLiquidity) {
                        const asset = option.quoteValue.token.symbol.toUpperCase()
                        if (
                          ((asset === 'WETH' || asset === 'SUSHI') &&
                            (option.strikePrice === '2.5' ||
                              option.strikePrice === '480') &&
                            (option.underlying.address ===
                              STABLECOINS[chainId].address ||
                              option.quoteValue.token.address ===
                                assetAddress)) ||
                          isTestnet
                        ) {
                          pairReserveTotal[0] = pairReserveTotal[0].add(
                            BigNumber.from(underlyingReserve)
                          )
                          puts.push({
                            entity: option,
                            asset: assetName,
                            market: market,
                            id: option.name,
                            venue: Venue.SUSHISWAP,
                          })
                        }
                      } else {
                        const asset = option.quoteValue.token.symbol.toUpperCase()
                        if (
                          (asset === assetName.toUpperCase() &&
                            (option.strikePrice === '2.5' ||
                              option.strikePrice === '480') &&
                            (option.underlying.address ===
                              STABLECOINS[chainId].address ||
                              option.quoteValue.token.address ===
                                assetAddress)) ||
                          isTestnet
                        ) {
                          pairReserveTotal[1] = pairReserveTotal[1].add(
                            BigNumber.from(underlyingReserve)
                          )
                          puts.push({
                            entity: option,
                            asset: assetName,
                            market: market,
                            id: option.name,
                            venue: Venue.SUSHISWAP,
                          })
                        }
                      }
                    }
                  }
                  dispatch(
                    updateOptions({
                      loading: false,
                      calls: calls,
                      puts: puts,
                      reservesTotal: pairReserveTotal,
                    })
                  )
                })
                .catch((error) => {
                  addNotif(0, 'Reserves Error', error.message, '')
                })
            })
            .catch((error) => addNotif(0, 'Pair Error', error.message, ''))
        })
        .catch((error) => {
          if (error) {
            addNotif(0, 'Options Error', error.message, '')
          }
        })
    },
    [dispatch, library, chainId, updateOptions, addNotif]
  )
}
