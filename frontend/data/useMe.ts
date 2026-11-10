import { useEffect, useState } from "react";
import { useIsFocused } from "@react-navigation/native";
import { useSelector } from "react-redux";

import type { RootState } from "../App";
import type { Me } from "../types";
import { loadMe } from "../data/users";

// My profile, read again every time the screen comes into view: an admin can give or take the VIP pass at any time
export function useMe() {
  const token = useSelector((state: RootState) => state.user.value.token);
  const isFocused = useIsFocused();

  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    if (!isFocused || !token) {
      return;
    }

    loadMe(token)
      .then((data) => {
        if (data.result) {
          setMe(data.user);
        }
      })
      // No VIP or admin buttons until the server answers: nothing else to show
      .catch(() => {});
  }, [isFocused, token]);

  return me;
}
