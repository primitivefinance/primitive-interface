import React, { useEffect } from 'react'
import styled from 'styled-components'

import useOrders from '../../../../hooks/useOrders'
import useOptions from '../../../../hooks/useOptions'
import usePositions from '../../../../hooks/usePositions'

import { useWeb3React } from '@web3-react/core'

import { OrderItem } from '../../../../contexts/Order/types'
import { destructureOptionSymbol } from 'lib/utils'

import Timer from '../Timer'
import Button from 'components/Button'
import LitContainer from 'components/LitContainer'
import Table from 'components/Table'
import TableBody from 'components/TableBody'
import TableCell from 'components/TableCell'
import TableRow from 'components/TableRow'

export type FormattedOption = {
  breakEven: number
  change: number
  price: number
  strike: number
  volume: number
}

export interface PositionsTableProps {
  positions: FormattedOption[]
  asset: string
  callActive: boolean
}

const PositionsTable: React.FC<PositionsTableProps> = (props) => {
  const { callActive, asset } = props
  const { options, getOptions } = useOptions()
  const { positions, getPositions } = usePositions()
  const { onAddItem } = useOrders()
  const { library } = useWeb3React()

  useEffect(() => {
    if (library) {
      getOptions(asset.toLowerCase())
    }
  }, [library, asset, getOptions])

  useEffect(() => {
    if (library) {
      if (options.calls.length > 1) {
        getPositions(asset.toLowerCase(), options)
      }
    }
  }, [library, asset, getPositions, options])

  const type = callActive ? 'calls' : 'puts'

  return (
    <Table>
      <StyledTableHead>
        <LitContainer>
          <TableRow isHead>
            <TableCell>Asset</TableCell>
            <TableCell>Strike</TableCell>
            <TableCell>Expires</TableCell>
            <TableCell>Qty</TableCell>
            <TableCell>Price</TableCell>
            <TableCell>Time Remaining</TableCell>
            <StyledButtonCell />
          </TableRow>
        </LitContainer>
      </StyledTableHead>
      <LitContainer>
        {positions[type].length > 1 ? (
          <TableBody>
            {positions[type].map((position, i) => {
              const { name, address, balance } = position
              const option: OrderItem = options[type][i]
              const { price, expiry } = option
              const {
                asset,
                year,
                month,
                day,
                strike,
              } = destructureOptionSymbol(name)

              return (
                <TableRow key={address}>
                  <TableCell>{asset === 'Ether' ? 'Weth' : asset}</TableCell>
                  <TableCell>{`$${(+strike).toFixed(2)}`}</TableCell>
                  <TableCell>{`${month}/${day}/${year}`}</TableCell>
                  <TableCell>{balance.toFixed(2)}</TableCell>
                  <TableCell>${price.toFixed(2)}</TableCell>
                  <TableCell>
                    <Timer expiry={expiry} />
                  </TableCell>
                  <StyledButtonCell>
                    <Button
                      onClick={() => {
                        onAddItem(option, {
                          buyOrMint: false,
                        })
                      }}
                      variant="secondary"
                    >
                      {'Close'}
                    </Button>
                  </StyledButtonCell>
                </TableRow>
              )
            })}
          </TableBody>
        ) : (
          <TableBody>
            <TableRow>
              <TableCell>
                <StyledLoadingBlock />
              </TableCell>
              <TableCell>
                <StyledLoadingBlock />
              </TableCell>
              <TableCell>
                <StyledLoadingBlock />
              </TableCell>
              <TableCell>
                <StyledLoadingBlock />
              </TableCell>
              <StyledButtonCell></StyledButtonCell>
            </TableRow>
          </TableBody>
        )}
      </LitContainer>
    </Table>
  )
}

const StyledLoadingBlock = styled.div`
  background-color: ${(props) => props.theme.color.grey[600]};
  width: 60px;
  height: 24px;
  border-radius: 12px;
`

const StyledTableHead = styled.div`
  background-color: ${(props) => props.theme.color.grey[800]};
  border-bottom: 1px solid ${(props) => props.theme.color.grey[600]};
`

const StyledButtonCell = styled.div`
  width: ${(props) => props.theme.buttonSize}px;
  margin-right: ${(props) => props.theme.spacing[2]}px;
  flex: 0.5;
`

export default PositionsTable
