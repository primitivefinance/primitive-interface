import { useCallback, useEffect, useState } from 'react'
import { formatEther } from 'ethers/lib/utils'

import { useWeb3React } from '@web3-react/core'

import { getBalance } from '@primitivefi/sdk'

export const useTokenBalance = (tokenAddress: string) => {
  const [balance, setBalance] = useState('0')
  const { account, library } = useWeb3React()

  const fetchBalance = useCallback(async () => {
    const balance = await getBalance(library, tokenAddress, account)
    setBalance((Math.ceil(parseInt(balance.toString()) * 100) / 100).toString())
  }, [account, library, tokenAddress])

  useEffect(() => {
    if (account && library) {
      fetchBalance()
      const refreshInterval = setInterval(fetchBalance, 10000)
      return () => clearInterval(refreshInterval)
    }
  }, [account, library, setBalance, tokenAddress, fetchBalance])

  return balance
}
