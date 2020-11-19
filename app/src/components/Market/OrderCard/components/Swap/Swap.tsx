import React, { useState, useCallback, useEffect } from 'react'
import styled from 'styled-components'
import ethers from 'ethers'

import Box from '@/components/Box'
import Button from '@/components/Button'
import IconButton from '@/components/IconButton'
import LineItem from '@/components/LineItem'
import PriceInput from '@/components/PriceInput'
import Spacer from '@/components/Spacer'
import Tooltip from '@/components/Tooltip'
import { Operation, UNISWAP_CONNECTOR } from '@/constants/index'

import { BigNumber } from 'ethers'
import { parseEther, formatEther } from 'ethers/lib/utils'

import useApprove from '@/hooks/useApprove'
import useTokenAllowance from '@/hooks/useTokenAllowance'
import useTokenBalance from '@/hooks/useTokenBalance'

import ArrowBackIcon from '@material-ui/icons/ArrowBack'
import ExpandMoreIcon from '@material-ui/icons/ExpandMore'
import ExpandLessIcon from '@material-ui/icons/ExpandLess'

import { UNISWAP_ROUTER02_V2 } from '@/lib/constants'

import {
  useItem,
  useUpdateItem,
  useHandleSubmitOrder,
  useRemoveItem,
} from '@/state/order/hooks'
import { useAddNotif } from '@/state/notifs/hooks'

import { useWeb3React } from '@web3-react/core'
import { Token, TokenAmount } from '@uniswap/sdk'

const Swap: React.FC = () => {
  // executes transactions
  const submitOrder = useHandleSubmitOrder()
  const updateItem = useUpdateItem()
  const removeItem = useRemoveItem()
  // toggle for advanced info
  const [advanced, setAdvanced] = useState(false)
  // approval state
  const { item, orderType, approved, loading } = useItem()

  // inputs for user quantity
  const [inputs, setInputs] = useState({
    primary: '',
    secondary: '',
  })
  // web3
  const { library, chainId } = useWeb3React()
  const addNotif = useAddNotif()

  // pair and option entities
  const entity = item.entity
  const underlyingToken: Token = new Token(
    entity.chainId,
    entity.assetAddresses[0],
    18,
    entity.isPut ? 'DAI' : item.asset.toUpperCase()
  )

  let title = { text: '', tip: '' }
  let tokenAddress: string
  switch (orderType) {
    case Operation.LONG:
      title = {
        text: 'Buy Long Tokens',
        tip: 'Purchase and hold option tokens.',
      }
      tokenAddress = underlyingToken.address
      break
    case Operation.SHORT:
      title = {
        text: 'Buy Short Tokens',
        tip: 'Purchase tokenized written covered options.',
      }
      tokenAddress = underlyingToken.address
      break
    case Operation.CLOSE_LONG:
      title = {
        text: 'Close Long Position',
        tip: `Sell option tokens for ${item.asset.toUpperCase()}`,
      }
      tokenAddress = entity.address
      break
    case Operation.CLOSE_SHORT:
      title = {
        text: 'Close Short Position',
        tip: `Sell short option tokens for ${item.asset.toUpperCase()}`,
      }
      tokenAddress = entity.assetAddresses[2]
      break
    default:
      break
  }
  const tokenBalance = useTokenBalance(tokenAddress)
  const tokenAmount: TokenAmount = new TokenAmount(
    underlyingToken,
    parseEther(tokenBalance).toString()
  )
  const spender =
    orderType === Operation.CLOSE_SHORT || orderType === Operation.CLOSE_LONG
      ? UNISWAP_ROUTER02_V2
      : UNISWAP_CONNECTOR[chainId]

  const tokenAllowance = useTokenAllowance(tokenAddress, spender)
  const underlyingTokenBalance = useTokenBalance(underlyingToken.address)
  const { onApprove } = useApprove(tokenAddress, spender)

  const handleInputChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      setInputs({ ...inputs, [e.currentTarget.name]: e.currentTarget.value })
    },
    [setInputs, inputs]
  )

  // FIX
  const handleSetMax = () => {
    const max = Math.round(
      ((+underlyingTokenBalance / (+item.premium + Number.EPSILON)) * 100) / 100
    )
    console.log(max)
    setInputs({ ...inputs, primary: max.toString() })
  }

  const handleSubmitClick = useCallback(() => {
    updateItem(item, orderType, true)
    submitOrder(
      library,
      item?.address,
      Number(inputs.primary),
      orderType,
      Number(inputs.secondary)
    )
    removeItem()
  }, [submitOrder, removeItem, item, library, inputs, orderType])

  const calculateTotalCost = useCallback(() => {
    let debit = '0'
    if (item.premium) {
      const premiumWei = BigNumber.from(item.premium.toString())
      const size = inputs.primary === '' ? '0' : inputs.primary
      const sizeWei = parseEther(size)
      debit = formatEther(
        premiumWei.mul(sizeWei).div(parseEther('1')).toString()
      )
    }
    return debit
  }, [item, inputs])

  //APPROVALS
  useEffect(() => {
    if (parseInt(tokenAllowance) > 0) {
      const approve: boolean = parseEther(tokenAllowance).gt(
        parseEther(inputs.primary || '0')
      )
      if (approve) {
        updateItem(item, orderType, loading, approve)
      }
    }
  }, [updateItem, item, loading, orderType, tokenAllowance])

  const handleApproval = useCallback(() => {
    onApprove()
      .then()
      .catch((error) => {
        addNotif(0, `Approving ${item.asset.toUpperCase()}`, error.message, '')
      })
  }, [inputs, tokenAllowance, onApprove])

  return (
    <>
      <Box row justifyContent="flex-start">
        <IconButton
          variant="tertiary"
          size="sm"
          onClick={() => updateItem(item, Operation.NONE)}
        >
          <ArrowBackIcon />
        </IconButton>
        <Spacer size="sm" />
        <StyledTitle>
          <Tooltip text={title.tip}>{title.text}</Tooltip>
        </StyledTitle>
      </Box>

      <Spacer />
      {orderType === Operation.SHORT ? (
        <LineItem
          label="Short Option Premium"
          data={formatEther(item.shortPremium)}
          units={entity.isPut ? 'DAI' : item.asset}
        />
      ) : (
        <LineItem
          label="Option Premium"
          data={formatEther(item.premium)}
          units={entity.isPut ? 'DAI' : item.asset}
        />
      )}
      <Spacer />
      <PriceInput
        title="Quantity"
        name="primary"
        onChange={handleInputChange}
        quantity={inputs.primary}
        onClick={handleSetMax}
        balance={tokenAmount}
      />

      <Spacer />
      <LineItem
        label={`Total ${
          orderType === Operation.LONG || orderType === Operation.SHORT
            ? 'Debit'
            : orderType === Operation.CLOSE_LONG ||
              orderType === Operation.CLOSE_SHORT
            ? 'Credit'
            : 'Debit'
        }`}
        data={calculateTotalCost()}
        units={`${
          orderType === Operation.LONG || orderType === Operation.SHORT
            ? '-'
            : orderType === Operation.CLOSE_LONG ||
              orderType === Operation.CLOSE_SHORT
            ? '+'
            : '-'
        } ${entity.isPut ? 'DAI' : item.asset.toUpperCase()}`}
      />
      <Spacer size="sm" />
      <IconButton
        text="Advanced"
        variant="transparent"
        onClick={() => setAdvanced(!advanced)}
      >
        {advanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
      </IconButton>
      <Spacer size="sm" />

      {advanced ? ( // FIX
        <>
          <LineItem label="Price Impact" data={``} />
          <Spacer />
        </>
      ) : (
        <> </>
      )}

      <Box row justifyContent="flex-start">
        {approved ? (
          <> </>
        ) : (
          <>
            {' '}
            <Button
              disabled={!tokenAllowance || loading}
              full
              size="sm"
              onClick={handleApproval}
              isLoading={loading}
              text="Approve"
            />
          </>
        )}
        <Button
          disabled={!approved || !inputs || loading}
          full
          size="sm"
          onClick={handleSubmitClick}
          isLoading={loading}
          text="Submit"
        />
      </Box>
    </>
  )
}

const StyledTitle = styled.h5`
  color: ${(props) => props.theme.color.white};
  font-size: 18px;
  font-weight: 700;
  margin: ${(props) => props.theme.spacing[2]}px;
`
export default Swap
