import React from 'react'
import styled from 'styled-components'

import Nav from './components/Nav'

const Footer: React.FC = () => (
  <StyledFooter>
    <StyledFooterInner>
      <Nav />
    </StyledFooterInner>
  </StyledFooter>
)

const StyledFooter = styled.footer`
  align-items: flex-end;
  display: flex;
  justify-content: center;
`
const StyledFooterInner = styled.div`
  align-items: center;
  display: flex;
  justify-content: flex-end;
  height: ${(props) => props.theme.topBarSize}px;
  max-width: ${(props) => props.theme.siteWidth}px;
  width: 100%;
  position: fixed;
  margin-right: ${(props) => props.theme.spacing[4]}px;
  padding: ${(props) => props.theme.spacing[4]}px;
`

export default Footer