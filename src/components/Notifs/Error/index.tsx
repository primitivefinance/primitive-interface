import React, { useState } from 'react'
import styled from 'styled-components'

import Box from '@/components/Box'
import Button from '@/components/Button'
import Card from '@/components/Card'
import CardContent from '@/components/CardContent'
import CardTitle from '@/components/CardTitle'
import { useClearNotif, useNotifs } from '@/state/notifs/hooks'
import ClearIcon from '@material-ui/icons/Clear'
import { CardActions } from '@material-ui/core'
import Spacer from '@/components/Spacer'
import ErrorIcon from '@material-ui/icons/Error'

export interface ErrorProps {
  title: string
  msg: string
  link: string
}

const Error: React.FC<ErrorProps> = ({ title, msg, link }) => {
  const clearNotif = useClearNotif()
  return (
    <StyledContainer>
      <StyledCard border>
        <CardTitle>
          <StyledTitle>
            <ErrorIcon /> <Spacer size="sm" />
            {title === '' ? 'Error' : title}
          </StyledTitle>
          <Button variant="transparent" size="sm" onClick={() => clearNotif(0)}>
            <ClearIcon />
          </Button>
        </CardTitle>
        <CardContent>
          <StyledContent>{msg}</StyledContent>
        </CardContent>
      </StyledCard>
    </StyledContainer>
  )
}
const StyledContainer = styled.div`
  width: 25em;
`

const StyledCard = styled(Card)`
  background: ${(props) => props.theme.color.grey[600]};
  border-color: red;
  border-width: 5px;
  border-style: solid;
  border-radius: 5px;
  overflow: hidden;
`
const StyledContent = styled.h4`
  margin: 0.5em 1em 0.5em 1em;
  color: red;
  width: inherit;
`
const StyledTitle = styled(Box)`
  align-items: center;
  display: flex;
  flex-direction: row;
  color: red;
  width: 100%;
`

export default Error
