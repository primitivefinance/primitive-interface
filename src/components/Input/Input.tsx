import React from 'react'
import styled from 'styled-components'

import Box from '../Box'
import Spacer from '../Spacer'
import { BigNumberish } from 'ethers'

import IconButton from '@/components/IconButton'

import { useClickAway } from '@/hooks/utils/useClickAway'

import AddIcon from '@material-ui/icons/Add'
import LaunchIcon from '@material-ui/icons/Launch'
import CheckIcon from '@material-ui/icons/Check'
import { Container } from '@material-ui/core'
import ClearIcon from '@material-ui/icons/Clear'
import Label from '@/components/Label'

import escapeRegExp from '@/utils/escapeRegExp'
export interface InputProps {
  name?: string
  endAdornment?: React.ReactNode
  onChange?: (input: string) => void
  placeholder?: string
  size?: 'sm' | 'md' | 'lg'
  startAdornment?: React.ReactNode
  value?: string
  valid?: boolean
}

export interface ValidatedProps {
  valid: boolean
}

const Validated: React.FC<ValidatedProps> = ({ valid }) => {
  return (
    <StyledIcon variant={valid ? 'default' : 'transparent'}>
      {valid ? <CheckIcon /> : <ClearIcon />}
    </StyledIcon>
  )
}

const inputRegex = RegExp(`^\\d*(?:\\\\[.])?\\d*$`)

const Input: React.FC<InputProps> = ({
  name,
  endAdornment,
  onChange,
  placeholder,
  size,
  startAdornment,
  value,
  valid,
}) => {
  let height = 56
  if (size === 'sm') {
    height = 44
  } else if (size === 'lg') {
    height = 72
  }
  const enforcer = (nextUserInput: string) => {
    if (nextUserInput === '' || inputRegex.test(escapeRegExp(nextUserInput))) {
      onChange(nextUserInput)
    }
  }
  return (
    <Box row alignItems="center" justifyContent="space-between">
      <StyledInputWrapper height={height}>
        {!!startAdornment && (
          <>
            {startAdornment}
            <Spacer size="sm" />
          </>
        )}
        <StyledInput
          name={name}
          height={height}
          onChange={(event) => {
            enforcer(event.target.value.replace(/,/g, '.'))
          }}
          autoComplete="off"
          autoCorrect="off"
          inputMode="decimal"
          title="Token Amount"
          pattern="^[0-9]*[.,]?[0-9]*$"
          minLength={1}
          maxLength={79}
          spellCheck="false"
          placeholder={placeholder}
          value={value}
        />
        {/* {!!endAdornment && (
          <StyledAd>
            <Spacer size="sm" />
            {endAdornment}
            <Spacer size="sm" />
          </StyledAd>
        )} */}
      </StyledInputWrapper>
    </Box>
  )
}

const StyledAd = styled.div`
  margin-left: -4em;
`
interface StyledInputProps {
  height: number
}

const LargeLabel = styled.div`
  color: ${(props) => props.theme.color.grey[400]};
  letter-spacing: 1px;
  font-size: 24px;
  text-transform: uppercase;
`

const StyledInputWrapper = styled.div<StyledInputProps>`
  align-items: center;
  background: ${(props) => props.theme.color.grey[800]};
  border-radius: ${(props) => props.theme.borderRadius}px;
  display: flex;
  height: ${(props) => props.height};
  width: 100%;
  &:hover {
    background: ${(props) => props.theme.color.grey[700]};
  }
`

const StyledInput = styled.input<StyledInputProps>`
  border-radius: ${(props) => props.theme.borderRadius}px;
  background: transparent;
  border: 1px solid ${(props) => props.theme.color.grey[600]};
  color: ${(props) => props.theme.color.white};
  font-size: 18px;
  flex: 1;
  height: ${(props) => props.height}px;
  margin: 0;
  padding: 0;
  outline: none;
  text-indent: ${(props) => props.theme.spacing[3]}px;
  &:focus {
    background: ${(props) => props.theme.color.grey[700]};
    border: 1px solid ${(props) => props.theme.color.white} !important;
    transition: border-color 0.25s ease-in-out;
  }
  -webkit-appearance: none;
  -moz-appearance: textfield !important;
`

interface StyledIconProps {
  variant: string
}

const StyledIcon = styled.div<StyledIconProps>`
  align-items: center;
  background: ${(props) =>
    props.variant === 'default' ? props.theme.color.white : 'transparent'};
  border: 2px solid ${(props) => props.theme.color.grey[800]};
  border-radius: 36px;
  box-sizing: border-box;
  color: ${(props) =>
    props.variant === 'default'
      ? props.theme.color.black
      : props.theme.color.white};
  display: flex;
  height: 36px;
  justify-content: center;
  letter-spacing: 0.5px;
  margin: 0;
  min-width: 36px;
  outline: none;
  padding-left: 0px;
  padding-right: 0px;
`

export default Input
