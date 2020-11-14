import React, { useState } from 'react'
import styled from 'styled-components'

import Box from '@/components/Box'
import Error from './Error'
import Trade from './Trade'
import Warning from './Warning'
import Spacer from '@/components/Spacer'
import { useClearNotif, useNotifs } from '@/state/notifs/hooks'

const Notifs: React.FC = () => {
  const notifs = useNotifs()

  if (notifs[0] && notifs[1] && notifs[2]) {
    return null
  }
  return (
    <StyledBox>
      {!notifs[0] ? null : (
        <Error
          title={notifs[0].title}
          msg={notifs[0].msg}
          link={notifs[0].link}
        />
      )}
      <Spacer size="sm" />
      {!notifs[1] ? null : (
        <Warning
          title={notifs[1].title}
          msg={notifs[1].msg}
          link={notifs[1].link}
        />
      )}
      <Spacer size="sm" />
      {!notifs[2] ? null : (
        <Trade
          title={notifs[2].title}
          msg={notifs[2].msg}
          link={notifs[2].link}
        />
      )}
    </StyledBox>
  )
}

const StyledBox = styled.div`
  max-width: 30em !important;
  position: absolute;
  bottom: 4em;
  left: 40px;
`
export default Notifs
