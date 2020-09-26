import React from 'react'
import styled, { keyframes } from 'styled-components'

import TableBody from 'components/TableBody'
import TableRow from 'components/TableRow'
import TableCell from 'components/TableCell'

export interface EmptyTableProps {
  columns: Array<any>
}

const EmptyTable: React.FC<EmptyTableProps> = (props) => {
  return (
    <TableBody>
      <TableRow>
        {props.columns.map((column, index) => {
          if (index === props.columns.length - 1) {
            return (
              <StyledButtonCell>
                <StyledLoadingBlock />
              </StyledButtonCell>
            )
          }
          return (
            <TableCell>
              <StyledLoadingBlock />
            </TableCell>
          )
        })}
      </TableRow>
    </TableBody>
  )
}

const changeColorWhileLoading = (color) => keyframes`
  0%   {background-color: ${color.grey[400]};}
  25%  {background-color: ${color.grey[500]};}
  50%  {background-color: ${color.grey[400]};}
  100% {background-color: ${color.grey[500]};}
`

const StyledLoadingBlock = styled.div`
  background-color: ${(props) => props.theme.color.grey[600]};
  width: 60px;
  height: 24px;
  border-radius: 12px;
  animation: ${(props) => changeColorWhileLoading(props.theme.color)} 2s linear
    infinite;
`

const StyledButtonCell = styled.div`
  width: ${(props) => props.theme.buttonSize}px;
  margin-right: ${(props) => props.theme.spacing[2]}px;
  flex: 0.5;
`

export default EmptyTable