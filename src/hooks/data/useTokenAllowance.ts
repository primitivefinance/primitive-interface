import { useCallback, useEffect, useState } from 'react'
import { formatEther } from 'ethers/lib/utils'
import { useWeb3React } from '@web3-react/core'
import { getAllowance } from '@primitivefi/sdk'

export const useTokenAllowance = () => {
  const [allowance, setAllowance] = useState('0')
  const { account, library } = useWeb3React()

  const fetchBalance = useCallback(
    async (tokenAddress: string, spender: string) => {
      const allowance = await getAllowance(
        library,
        tokenAddress,
        account,
        spender
      )
      setAllowance(formatEther(allowance).toString())
    },
    [account, library, allowance, setAllowance]
  )

  return [allowance, fetchBalance]
}
