import { configureStore } from '@reduxjs/toolkit';
import bodyReducer from "./bodySlice";
import userReducer from "./userSlice";
import uiReducer from "./uiSlice";
import favoriteReducer from "./favoriteSlice";
import tryOnReducer from "./tryOnSlice";

export const store = configureStore({
    reducer: {
        user: userReducer,
        body: bodyReducer,
        ui: uiReducer,
        favorite: favoriteReducer,
        tryOn: tryOnReducer,
    }
})
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;