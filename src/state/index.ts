import { configureStore, getDefaultMiddleware } from '@reduxjs/toolkit'
import { save, load } from 'redux-localstorage-simple'

import notifs from './notifs/reducer'
import options from './options/reducer'
import order from './order/reducer'
import positions from './positions/reducer'
import transactions from './transactions/reducer'
import swap from './swap/reducer'
import liquidity from './liquidity/reducer'
import price from './price/reducer'
import user from './user/reducer'

const PERSISTED_KEYS: string[] = ['transactions']

const store = configureStore({
  reducer: {
    liquidity,
    notifs,
    options,
    order,
    price,
    positions,
    swap,
    transactions,
    user,
  },
  middleware: getDefaultMiddleware({
    serializableCheck: {
      // Ignore these action types
      ignoredActions: [
        '<root>',
        'liquidity/optionInput',
        'liquidity/underInput',
        'liquidity/clearInput',
        'notifs/clearNotif',
        'notifs/addNotif',
        'notifs/resetNotif',
        'options/updateOptions',
        'options/clearOptions',
        'order/updateItem',
        'order/removeItem',
        'positions/updatePositions',
        'positions/setLoading',
        'positions/clearPositions',
        'price/updatePrice',
        'swap/typeInput',
        'swap/setLoading',
        'swap/setReduce',
        'swap/clearInput',
        'transactions/addTransaction',
        'transactions/clearAllTransactions',
        'transactions/checkedTransaction',
        'transactions/finalizeTransaction',
        'user/updateSlippage',
      ],
    },
  }),
})

export default store

export type AppState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
