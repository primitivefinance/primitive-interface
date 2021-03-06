import { createAction } from '@reduxjs/toolkit'
import { ChainId } from '@sushiswap/sdk'
import { Operation } from '@/constants/index'

export interface SerializableTransactionReceipt {
  to: string
  from: string
  contractAddress: string
  transactionIndex: number
  blockHash: string
  transactionHash: string
  blockNumber: number
  status?: number
}

export interface Transaction {
  hash: string
  orderType?: Operation
  approval?: { tokenAddress: string; spender: string }
  summary?: { type: string; option: any; amount: string }
  receipt?: SerializableTransactionReceipt
  lastCheckedBlockNumber?: number
  addedTime: number
  confirmedTime?: number
  from: string
}

export type TransactionState = {
  [chainId in ChainId]: {
    [txHash: string]: Transaction
  }
}

export const addTransaction = createAction<{
  chainId: ChainId
  tx: Transaction
  orderType: Operation
}>('transactions/addTransaction')

export const clearAllTransactions = createAction<{ chainId: ChainId }>(
  'transactions/clearAllTransactions'
)
export const finalizeTransaction = createAction<{
  chainId: ChainId
  hash: string
  receipt: SerializableTransactionReceipt
}>('transactions/finalizeTransaction')

export const checkedTransaction = createAction<{
  chainId: ChainId
  hash: string
  blockNumber: number
}>('transactions/checkedTransaction')
