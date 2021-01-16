import React, { useEffect, useState, useCallback } from 'react'
import styled from 'styled-components'
import TableRow from '@/components/TableRow'
import TableCell from '@/components/TableCell'

import numeral from 'numeral'
import isZero from '@/utils/isZero'
import { parseEther } from 'ethers/lib/utils'
import formatExpiry from '@/utils/formatExpiry'
import { useItem } from '@/state/order/hooks'
import Button from '@/components/Button'
import { useClickAway } from '@/hooks/utils/useClickAway'
import AddIcon from '@material-ui/icons/Add'
import CheckIcon from '@material-ui/icons/Check'
import PriceInput from '@/components/PriceInput'
import ClearIcon from '@material-ui/icons/Clear'
import Tooltip from '@/components/Tooltip'
import Box from '@/components/Box'
import Spacer from '@/components/Spacer'

export interface TableColumns {
  key: string
  asset: string
  strike: string
  share: string
  asset1: string
  asset2: string
  fees: string
  liquidity: string[]
  expiry: number
  isCall: boolean
}

export interface LiquidityTableRowProps {
  onClick: () => void
  columns: TableColumns
  href: string
}

const LiquidityTableRow: React.FC<LiquidityTableRowProps> = ({
  onClick,
  columns,
  href,
}) => {
  const [toggle, setToggle] = useState(false)
  const { item } = useItem()
  const currentTimestamp = new Date()
  const {
    key,
    asset,
    strike,
    share,
    asset1,
    asset2,
    fees,
    liquidity,
    expiry,
    isCall,
  } = columns
  const handleOnClick = useCallback(() => {
    setToggle(!toggle)
  }, [toggle, setToggle])
  const handleOnAdd = (e) => {
    e.stopPropagation()
    onClick()
  }
  /* const nodeRef = useClickAway(() => {
    setToggle(false)
  }) */

  const units = isCall ? asset.toUpperCase() : 'DAI'

  return (
    <StyledDiv>
      <TableRow
        isActive={
          item.entity === null
            ? false
            : item?.entity.address === key
            ? true
            : false
        }
        key={key}
        onClick={handleOnClick}
      >
        <TableCell>
          <span>
            {numeral(strike).format(+strike >= 1 ? '0' : '0.00')}{' '}
            <Units>DAI</Units>
          </span>
        </TableCell>
        <TableCell>
          {!isZero(parseEther(asset1)) ? (
            <span>
              {numeral(share).format('0.00')} <Units>$</Units>
            </span>
          ) : (
            <>{`-`}</>
          )}
        </TableCell>
        {!isZero(parseEther(asset1)) ? (
          <TableCell>
            {isCall ? (
              <span>
                {numeral(asset1).format('(0.000a)')} <Units>{units}</Units>
              </span>
            ) : (
              <span>
                {numeral(asset1).format('(0.000a)')} <Units>$</Units>
              </span>
            )}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {!isZero(parseEther(asset2)) ? (
          <TableCell>
            {isCall ? (
              <span>
                {numeral(asset2).format('(0.000a)')} <Units>{units}</Units>
              </span>
            ) : (
              <span>
                {numeral(asset2).format('(0.000a)')} <Units>$</Units>
              </span>
            )}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {!isZero(parseEther(fees)) ? (
          <TableCell>
            {isCall ? (
              <span>
                {numeral(fees).format('(0.000a)')} <Units>{units}</Units>
              </span>
            ) : (
              <span>
                {numeral(fees).format('(0.000a)')} <Units>$</Units>
              </span>
            )}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {parseFloat(liquidity[0]) > 0 ? (
          <TableCell>
            <span>
              {numeral(liquidity[0]).format('0.00a')} <Units>{units}</Units>
            </span>
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {expiry ? (
          <TableCell>
            <span>{formatExpiry(expiry).utc.substr(4, 12)}</span>
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        <StyledButtonCell key={'Open'}>
          <Button
            onClick={handleOnClick}
            variant={
              item.entity === null
                ? 'outlined'
                : item.entity.address === key
                ? 'selected-outlined'
                : 'outlined'
            }
            size="sm"
            text="Add Liquidity"
          />
        </StyledButtonCell>
      </TableRow>
      {toggle ? (
        <OrderTableRow onClick={() => {}}>
          <Box column>
            <Spacer />
            <StyledTitle>
              <Tooltip text={'Provide assets to the pool.'}>
                {'Add Liquidity'}
              </Tooltip>
              <CustomButton>
                <Button variant="transparent" size="sm" onClick={handleOnClick}>
                  <ClearIcon />
                </Button>
              </CustomButton>
            </StyledTitle>
            <Separator />
            <Spacer />
            <PriceInput
              title="Quantity"
              name="primary"
              onChange={() => {}}
              quantity={'1'}
              onClick={() => {}}
              valid={true}
            />
            <Spacer />
            <Button
              disabled={false}
              full
              size="sm"
              onClick={() => {}}
              isLoading={false}
              text={'Confirm'}
            />
          </Box>
        </OrderTableRow>
      ) : (
        <></>
      )}
    </StyledDiv>
  )
}

const CustomButton = styled.div`
  margin-top: -0.1em;
  background: none;
`
const Separator = styled.div`
  border: 1px solid ${(props) => props.theme.color.grey[600]};
  width: 100%;
`

const StyledTitle = styled.div`
  align-items: center;
  color: ${(props) => props.theme.color.white};
  font-size: 16px;
  font-weight: 700;
  display: flex;
  width: 100%;
  letter-spacing: 0.5px;
  justify-content: space-between;
`
const StyledDiv = styled.div`
  color: black;
`

const StyledButtonCell = styled.div`
  font-weight: inherit;
  justify-content: flex-start;
`

const Units = styled.span`
  opacity: 0.66;
  font-size: 12px;
`

interface StyleProps {
  isHead?: boolean
  isActive?: boolean
}

const OrderTableRow = styled.div<StyleProps>`
  background-color: ${(props) => props.theme.color.grey[800]};
  border-bottom: 1px solid
    ${(props) =>
      props.isHead || props.isActive
        ? 'transparent'
        : props.theme.color.grey[700]};
  color: ${(props) =>
    props.isHead ? props.theme.color.grey[400] : props.theme.color.white};
  display: flex;
  height: 25em;
  margin-left: -${(props) => props.theme.spacing[4]}px;
  padding-left: ${(props) => props.theme.spacing[4]}px;
  padding-right: ${(props) => props.theme.spacing[4]}px;
`

export default LiquidityTableRow