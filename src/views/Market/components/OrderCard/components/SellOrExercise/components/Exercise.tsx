import React, { useCallback, useState } from 'react'

import { useWeb3React } from '@web3-react/core'

import Box from 'components/Box'
import Button from 'components/Button'
import Input from 'components/Input'
import Label from 'components/Label'
import Spacer from 'components/Spacer'

import useOrders from 'hooks/useOrders'

const Exercise: React.FC = () => {
  const { exerciseOptions, item } = useOrders()
  const [quantity, setQuantity] = useState('')
  const { library } = useWeb3React()

  const handleExerciseClick = useCallback(() => {
    exerciseOptions(library, item?.address, Number(quantity))
  }, [exerciseOptions, item, library, quantity])

  const handleQuantityChange = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      if (!e.currentTarget.value) {
        setQuantity('')
      }
      if (Number(e.currentTarget.value)) {
        setQuantity(e.currentTarget.value)
      }
    },
    [setQuantity]
  )

  let purchasePower = 100000

  const handleSetMax = () => {
    let max =
      Math.round((purchasePower / +item.price + Number.EPSILON) * 100) / 100
    setQuantity(max.toString())
  }

  return (
    <>
      <Spacer />
      <Box row justifyContent="space-between">
        <Label text="Price" />
        <span>${item.price.toFixed(2)}</span>
      </Box>
      <Spacer />
      <Label text="Quantity" />
      <Spacer size="sm" />
      <Input
        placeholder="0.00"
        onChange={handleQuantityChange}
        value={`${quantity}`}
        endAdornment={<Button size="sm" text="Max" onClick={handleSetMax} />}
      />
      <Spacer />
      <Box row justifyContent="space-between">
        <Label text="Total Cost" />
        <span>
          {+quantity ? '-' : ''}${(+item.strike * +quantity).toFixed(2)}
        </span>
      </Box>
      <Spacer />
      <Box row justifyContent="space-between">
        <Label text="Recieve" />
        <span>
          {`${(+quantity).toFixed(2)} ${item.id.slice(0, 3).toUpperCase()}`}
        </span>
      </Box>
      <Spacer />
      <Button
        disabled={!quantity}
        full
        onClick={handleExerciseClick}
        text="Continue to Review"
      />
    </>
  )
}

export default Exercise
