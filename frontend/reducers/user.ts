import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

type Inventory = {
  doubleur: number;
  assurance: number;
  bouclier: number;
  sabotage: number;
};

type UserState = {
  value: {
    token: string | null;
    username: string | null;
    email: string | null;
    avatar: string | null;
    inventory: Inventory | null;
  };
};

type LoginPayload = {
  token: string;
  username: string;
  email: string;
  avatar?: string;
  inventory?: Inventory;
};

const initialState: UserState = {
  value: { token: null, username: null, email: null, avatar: null, inventory: null },
};

export const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    login: (state, action: PayloadAction<LoginPayload>) => {
      state.value.token = action.payload.token;
      state.value.username = action.payload.username;
      state.value.email = action.payload.email;
      state.value.avatar = action.payload.avatar ?? null;
      state.value.inventory = action.payload.inventory ?? null;
    },
    logout: (state) => {
      state.value.token = null;
      state.value.username = null;
      state.value.email = null;
      state.value.avatar = null;
      state.value.inventory = null;
    },
  },
});

export const { login, logout } = userSlice.actions;
export default userSlice.reducer;
