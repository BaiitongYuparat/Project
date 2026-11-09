import { configureStore } from '@reduxjs/toolkit'
import bodyReducer from "./bodySlice";
import userReducer from "./userSlice";
import uiReducer from './uiSlice'
import bodyTypeReducer from './bodyTypeSlice';

export const store = configureStore({
  reducer: {
    user:userReducer,
    body: bodyReducer,
    ui:uiReducer,
    bodyType: bodyTypeReducer,
  }
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;