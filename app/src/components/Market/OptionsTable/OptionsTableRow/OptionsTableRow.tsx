import React, { useState, useCallback } from 'react'
import styled from 'styled-components'
import TableCell from '@/components/TableCell'
import TableRow from '@/components/TableRow'
import AddIcon from '@material-ui/icons/Add'
import LaunchIcon from '@material-ui/icons/Launch'
import GreeksTableRow, { Greeks } from '../GreeksTableRow'
import { useClickAway } from '@/hooks/utils/useClickAway'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
export interface TableColumns {
  key: string
  asset: string
  strike: string
  breakeven: string
  premium: string
  premiumUnderlying: string
  depth: string
  reserves: string[]
  address: string
}

export interface OptionsTableRowProps {
  onClick: () => void
  columns: TableColumns
  href: string
  greeks: Greeks
}

const OptionsTableRow: React.FC<OptionsTableRowProps> = ({
  onClick,
  columns,
  href,
  greeks,
}) => {
  const [toggle, setToggle] = useState(false)
  const {
    key,
    asset,
    strike,
    breakeven,
    premium,
    premiumUnderlying,
    depth,
    reserves,
    address,
  } = columns
  const handleOnClick = useCallback(() => {
    setToggle(!toggle)
  }, [toggle, setToggle])
  const handleOnAdd = (e) => {
    e.stopPropagation()
    onClick()
  }
  const nodeRef = useClickAway(() => {
    setToggle(false)
  })
  return (
    <div ref={nodeRef}>
      <TableRow key={key} onClick={handleOnClick}>
        <TableCell>${strike}</TableCell>
        <TableCell>$ {breakeven}</TableCell>
        {+premium > 0 ? (
          <TableCell>
            $ {premium} / {premiumUnderlying} {asset}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {+depth > 0 ? (
          <TableCell>
            {depth} {'Options'}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        {+reserves[0] > 0 ? (
          <TableCell>
            {reserves[0]} {asset.toUpperCase()} / {reserves[1]} {'SHORT'}
          </TableCell>
        ) : (
          <TableCell>-</TableCell>
        )}
        <TableCell key={address}>
          <StyledARef href={href} target="__blank">
            {address} <LaunchIcon style={{ fontSize: '14px' }} />
          </StyledARef>
        </TableCell>
        <StyledButtonCell key={'Open'}>
          <StyledARef onClick={(e) => handleOnAdd(e)}>
            {toggle ? <ExpandMoreIcon /> : <AddIcon />}
          </StyledARef>
        </StyledButtonCell>
      </TableRow>
      {toggle ? (
        <GreeksTableRow onClick={() => setToggle(!toggle)} greeks={greeks} />
      ) : (
        <></>
      )}
    </div>
  )
}

const StyledARef = styled.a`
  color: ${(props) => props.theme.color.white};
  text-decoration: none;
`

const StyledButtonCell = styled.div`
  font-weight: inherit;
  flex: 0.25;
  margin-right: ${(props) => props.theme.spacing[2]}px;
  width: ${(props) => props.theme.buttonSize}px;
`

export default OptionsTableRow
