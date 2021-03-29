import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import Spacer from '@/components/Spacer'
import Box from '@/components/Box'
import Loader from '@/components/Loader'
import Disclaimer from '@/components/Disclaimer'
import Button from '@/components/Button'
import Notifs from '@/components/Notifs'
import PriceInput from '@/components/PriceInput'
import LineItem from '@/components/LineItem'
import Label from '@/components/Label'
import { BigNumber } from 'ethers'

import MetaMaskOnboarding from '@metamask/onboarding'

import { useActiveWeb3React } from '@/hooks/user/index'
import ErrorBoundary from '@/components/ErrorBoundary'
import { useRouter } from 'next/router'

import { useClearNotif } from '@/state/notifs/hooks'

import { Grid, Col, Row } from 'react-styled-flexboxgrid'
import mintTestTokens from '@/utils/mintTestTokens'
import { useTokenBalance } from '@/hooks/data/useTokenBalance'
import { parseEther, formatEther } from 'ethers/lib/utils'
import getCapital from '@/utils/experimental/getCapital'
import getAccumulator from '@/utils/experimental/getAccumulator'
import getCalibration from '@/utils/experimental/getCalibration'
import getPosition from '@/utils/experimental/getPosition'

interface Position {
  owner: string
  nonce: number
  BX1: number
  BY2: number
  liquidity: number
  unlocked: boolean
}
interface Calibration {
  strike: number
  sigma: number
  time: number
}
interface Capital {
  RX1: number
  RX2: number
  liquidity: number
}
interface Accumulator {
  ARX1: number
  ARX2: number
  blockNumberLast: number
}
const Experimental = () => {
  const tokenX = '0xf09A9Db4327b16A9663e46f49bDaab1A0BEC1252'
  const tokenY = '0xf292A6Aa8fAEfC375326AC64bA69904301bD210b'
  const { chainId, active, account, library } = useActiveWeb3React()
  const [id, storeId] = useState(chainId)
  const [changing, setChanging] = useState(false)
  const router = useRouter()
  const clear = useClearNotif()

  const [position, setPos] = useState<Position>({
    owner: account,
    nonce: 0,
    BX1: 0,
    BY2: 0,
    liquidity: 0,
    unlocked: false,
  })
  const [calibration, setCali] = useState<Calibration>({
    strike: 0,
    sigma: 0,
    time: 0,
  })
  const [capital, setCapital] = useState<Capital>({
    RX1: 0,
    RX2: 0,
    liquidity: 0,
  })
  const [accumulator, setAccum] = useState<Accumulator>({
    ARX1: 0,
    ARX2: 0,
    blockNumberLast: 0,
  })
  useEffect(async () => {
    if (library) {
      const tempPos = await getPosition(account, '1', library.getSigner())
      if (tempPos) setPos(tempPos)

      const tempC = await getCalibration(library.getSigner())
      if (tempC) setCali(tempC)

      const tempCap = await getCapital(library.getSigner())
      if (tempCap) setCapital(tempCap)

      const tempAcc = await getAccumulator(library.getSigner())
      if (tempAcc) setAccum(tempAcc)
    }
  }, [library, account])
  const tokenXBalance = useTokenBalance(tokenX)
  const tokenYBalance = useTokenBalance(tokenY)
  const [swapToX, setToSwapX] = useState(false)
  const [swap1, setSwap1] = useState('')
  const [swap2, setSwap2] = useState('')

  const requiredAlt = useCallback(() => {
    if (swap1 !== '') {
      return swap1
    } else {
      return '0'
    }
  }, [swap1, swap2, swapToX])
  const submitSwap = useCallback(() => {
    return
  }, [swap1, swap2])
  const [addLP, setAddLP] = useState('')
  const requiredY = useCallback(() => {
    if (addLP !== '') {
      return addLP
    } else {
      return '0'
    }
  }, [addLP])
  const submitLP = useCallback(() => {
    return
  }, [requiredY, addLP])
  useEffect(() => {
    const { ethereum, web3 } = window as any

    if (MetaMaskOnboarding.isMetaMaskInstalled() && (!ethereum || !web3)) {
      clear(0)
      router.reload()
    }
    if (ethereum) {
      const handleChainChanged = () => {
        if (id !== chainId) {
          setChanging(true)
          storeId(chainId)
          // eat errors
          clear(0)
          router.reload()
        }
      }
      const handleAccountChanged = () => {
        router.reload()
      }
      if (ethereum?.on) {
        ethereum?.on('chainChanged', handleChainChanged)
        ethereum?.on('accountsChanged', handleAccountChanged)
      }
      return () => {
        if (ethereum?.removeListener) {
          ethereum.removeListener('chainChanged', handleChainChanged)
          ethereum.removeListener('accountsChanged', handleAccountChanged)
        }
      }
    }
  }, [id, chainId, storeId])
  if (!active) {
    return (
      <>
        <Spacer />
        <Loader size="lg" />
      </>
    )
  }
  if (!(chainId === 42) && active) {
    return (
      <>
        <Spacer />
        <Text>Switch to Kovan Network</Text>
      </>
    )
  }
  if (
    !MetaMaskOnboarding.isMetaMaskInstalled() ||
    !(window as any)?.ethereum ||
    !(window as any)?.web3
  ) {
    return (
      <>
        <Spacer />

        <Text>Install Metamask to View Experiments</Text>
      </>
    )
  }
  if (MetaMaskOnboarding.isMetaMaskInstalled() && !account) {
    return (
      <>
        <Spacer />
        <Text>Connect to Metamask to View Experiments</Text>
      </>
    )
  }

  return (
    <ErrorBoundary
      fallback={
        <>
          <Spacer />
          <Text>Error Loading Experiments Please Refresh</Text>
        </>
      }
    >
      {changing ? (
        <>
          <Spacer />
          <Spacer />
          <Loader size="lg" />
        </>
      ) : (
        <StyledMarket>
          <Disclaimer />
          <Notifs />
          <Grid id={'market-grid'}>
            <Col>
              <Spacer />

              <StyledHeaderContainer>
                Experimental Replicator
              </StyledHeaderContainer>

              <Box row>
                <StyledHeader>
                  <Box column>
                    <div style={{ minWidth: '17em' }} />
                    <Box>
                      Engine Calibration
                      <Spacer size="sm" />
                      <LineItem
                        label="Strike Price"
                        data={calibration.strike}
                        units="Token 2 (Y)"
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Sigma"
                        data={calibration.sigma}
                        units="σ"
                      />
                      <Spacer size="sm" />
                      <LineItem label="Time Factor" data={calibration.time} />
                    </Box>
                    <Spacer size="lg" />
                    <Box>
                      Pool Capital
                      <Spacer size="sm" />
                      <LineItem
                        label="X Reserve"
                        data={capital.RX1}
                        units="Token 1 (X)"
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Y Reserve"
                        data={capital.RX2}
                        units="Token 2 (Y)"
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Total Liquidity"
                        data={capital.liquidity}
                        units="LP"
                      />
                    </Box>
                    <Spacer size="lg" />
                    <Box>
                      Accumulator
                      <Spacer size="sm" />
                      <LineItem
                        label="X Accum. Reserve"
                        data={accumulator.ARX1}
                        units="Token 1 (X)"
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Y Accum. Reserve"
                        data={accumulator.ARX2}
                        units="Token 2 (Y)"
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Last Block Checked"
                        data={accumulator.blockNumberLast}
                      />
                    </Box>
                  </Box>
                </StyledHeader>
                <StyledHeader>
                  <Box>
                    <Box row justifyContent="space-between" alignItems="center">
                      {' '}
                      Your Option Position{' '}
                      <Label text={position.unlocked ? 'unlocked' : 'locked'} />
                    </Box>
                    <div style={{ minWidth: '20em' }} />
                    <Spacer size="sm" />
                    <LineItem label="Nonce" data={position.nonce} />
                    <Spacer size="sm" />
                    <LineItem
                      label="Token 1 (X) Balance"
                      data={position.BX1}
                      units="Token 1 (X)"
                    />
                    <Spacer size="sm" />
                    <LineItem
                      label="Token 2 (Y) Balance"
                      data={position.BY2}
                      units="Token 2 (Y)"
                    />
                    <Spacer size="sm" />
                    <LineItem
                      label="Liquidity"
                      data={position.liquidity}
                      units="LP"
                    />
                  </Box>
                  <Spacer size="lg" />
                  Token Balances
                  <Spacer size="sm" />
                  <Box column>
                    <LineItem
                      label=""
                      data={parseEther(parseInt(tokenXBalance).toString())
                        .div('100000000')
                        .toString()}
                      units="Token 1 (X)"
                    />
                  </Box>
                  <Spacer size="sm" />
                  <Box column>
                    <LineItem
                      label=""
                      data={parseEther(parseInt(tokenYBalance).toString())
                        .div('100000000')
                        .toString()}
                      units="Token 2 (Y)"
                    />
                  </Box>
                  <Spacer size="sm" />
                  <Box row>
                    <Button
                      variant="secondary"
                      full
                      onClick={async () =>
                        await mintTestTokens(
                          account,
                          tokenX,
                          library.getSigner()
                        )
                      }
                    >
                      Mint X Tokens
                    </Button>
                    <Spacer size="sm" />
                    <Button
                      variant="secondary"
                      full
                      onClick={async () =>
                        await mintTestTokens(
                          account,
                          tokenY,
                          library.getSigner()
                        )
                      }
                    >
                      Mint Y Tokens
                    </Button>
                  </Box>
                </StyledHeader>

                <StyledHeader>
                  <Box column>
                    <Box>
                      Swap
                      <Spacer size="sm" />
                      <div style={{ minWidth: '17em' }} />
                      <PriceInput
                        title="Token 1 (X)"
                        quantity={swap1}
                        onChange={(input) => setSwap1(input)}
                        onClick={() => {
                          return
                        }}
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Token 2 (Y) Required"
                        data={requiredAlt()}
                        units="Token 2 (Y)"
                      />
                      <Spacer size="sm" />
                      <Button
                        variant="secondary"
                        full
                        onClick={() => submitLP()}
                      >
                        Confirm Swap
                      </Button>
                    </Box>
                    <Spacer />
                    <Box>
                      Add Liquidity
                      <Spacer size="sm" />
                      <PriceInput
                        title="Token 1 (X)"
                        quantity={addLP}
                        onChange={(input) => setAddLP(input)}
                        onClick={() => {
                          return
                        }}
                      />
                      <Spacer size="sm" />
                      <LineItem
                        label="Token 2 (Y) Required"
                        data={requiredY()}
                        units="Token 2 (Y)"
                      />
                      <Spacer size="sm" />
                      <Button
                        variant="secondary"
                        full
                        onClick={() => submitLP()}
                      >
                        Confirm Add Liquidity
                      </Button>
                    </Box>
                  </Box>
                </StyledHeader>
              </Box>
            </Col>
          </Grid>
        </StyledMarket>
      )}
    </ErrorBoundary>
  )
}

const StyledDiv = styled.div`
  display: inherit;
`
const StyledMarket = styled.div`
  width: 100%;
  min-height: 85vh;
  overflow-x: hidden;
  overflow-y: allowed !important;
  position: absolute;
  &::-webkit-scrollbar {
    width: 0px;
    height: 15px;
  }
  position: absolute;
  &::-webkit-scrollbar-track-piece {
    background-color: ${(props) => props.theme.color.grey[800]};
  }

  &::-webkit-scrollbar-thumb:vertical {
    height: 30px;
    background-color: ${(props) => props.theme.color.grey[700]};
  }
  scrollbar-color: ${(props) => props.theme.color.grey[800]};
  scrollbar-width: thin;
`
export const StyledLitContainer = styled.div``

const StyledHeaderContainer = styled.div`
  width: 100%;
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  font-size: 24px;
  flex-grow: 1;
  color: white;
`

const StyledHeader = styled.div`
  width: 33%;
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: flex-start;
  font-size: 18px;
  flex-grow: 1;
  color: white;
  padding: 2em;
`

const Text = styled.span`
  color: ${(props) => props.theme.color.white};
  font-size: 24px;
  font-weight: 700;
  letter-spacing: 1px;
  text-transform: uppercase;
  display: flex;
  justify-content: center;
`
const StyledContainer = styled(Col)`
  height: 100%;
  display: flex;
  flex-direction: row;
  justify-content: flex-start;
  align-items: center;
  flex-grow: 1;
`

export default Experimental
