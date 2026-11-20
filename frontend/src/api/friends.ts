import { requestJson } from "./client";
import type { RequestOptions } from "./types";

export interface FriendUser {
  user_id: string;
  username: string;
}

export interface FriendRequest extends FriendUser {
  created_at: string;
}

export interface FriendRequestsResponse {
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
}

export interface Friend extends FriendUser {
  accepted_at: string;
}

export interface SentFriendRequest extends FriendUser {
  status: "pending";
}

export function getFriends(accessToken: string, options: RequestOptions = {}) {
  return requestJson<Friend[]>("/friends", { ...options, accessToken });
}

export function getFriendRequests(
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<FriendRequestsResponse>("/friends/requests", {
    ...options,
    accessToken,
  });
}

export function sendFriendRequest(
  username: string,
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<SentFriendRequest>("/friends/requests", {
    ...options,
    method: "POST",
    body: { username },
    accessToken,
  });
}

export function acceptFriendRequest(
  userId: string,
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<void>(`/friends/requests/${userId}/accept`, {
    ...options,
    method: "POST",
    accessToken,
  });
}

export function deleteFriendRequest(
  userId: string,
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<void>(`/friends/requests/${userId}`, {
    ...options,
    method: "DELETE",
    accessToken,
  });
}

export function removeFriend(
  userId: string,
  accessToken: string,
  options: RequestOptions = {},
) {
  return requestJson<void>(`/friends/${userId}`, {
    ...options,
    method: "DELETE",
    accessToken,
  });
}
