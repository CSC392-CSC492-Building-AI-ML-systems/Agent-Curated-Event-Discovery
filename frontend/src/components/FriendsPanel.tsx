import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";

import {
  getFriends,
  getFriendRequests,
  sendFriendRequest,
  acceptFriendRequest,
  deleteFriendRequest,
  removeFriend,
} from "../api/friends";

import type { Friend, FriendRequestsResponse } from "../api/friends";
import "./FriendsPanel.css";

type Props = {
  accessToken: string;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong";
}

export default function FriendsPanel({ accessToken }: Props) {
  const [username, setUsername] = useState("");
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequestsResponse>({
    incoming: [],
    outgoing: [],
  });

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      const [friendsData, requestsData] = await Promise.all([
        getFriends(accessToken, { signal }),
        getFriendRequests(accessToken, { signal }),
      ]);

      if (signal?.aborted) return;

      setFriends(friendsData);
      setRequests(requestsData);
    },
    [accessToken],
  );

  useEffect(() => {
    const controller = new AbortController();

    setLoading(true);
    setError(null);

    void refresh(controller.signal)
      .catch((err) => {
        if (!controller.signal.aborted) setError(errorMessage(err));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [refresh]);

  async function runAction(
    action: () => Promise<unknown>,
    onSuccess?: () => void,
  ) {
    if (busy) return;

    setBusy(true);
    setError(null);

    try {
      await action();
      onSuccess?.();
      await refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  function handleAddFriend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const value = username.trim();
    if (!value) return;

    void runAction(
      () => sendFriendRequest(value, accessToken),
      () => setUsername(""),
    );
  }

  function handleRemoveFriend(friend: Friend) {
    const confirmed = window.confirm(
      `Are you sure you want to remove ${friend.username} from your friends?`,
    );

    if (!confirmed) return;

    void runAction(() => removeFriend(friend.user_id, accessToken));
  }

  return (
    <section className="friends-panel">
      <form className="friends-add" onSubmit={handleAddFriend}>
        <input
          type="text"
          aria-label="Friend's username"
          placeholder="Enter username..."
          value={username}
          maxLength={64}
          onChange={(e) => setUsername(e.target.value)}
        />
        <button
          type="submit"
          className="friends-primary"
          disabled={busy || loading || !username.trim()}
        >
          Add Friend
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {loading ? (
        <p role="status">Loading friends...</p>
      ) : (
        <>
          <h2>Friend Requests</h2>

          {!requests.incoming.length && !requests.outgoing.length && (
            <p>No pending requests.</p>
          )}

          {requests.incoming.map((request) => (
            <div className="friends-row" key={request.user_id}>
              <span>
                <strong>{request.username}</strong>: incoming
              </span>
              <div className="friends-actions">
                <button
                  className="friends-primary"
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      acceptFriendRequest(request.user_id, accessToken),
                    )
                  }
                >
                  Accept
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void runAction(() =>
                      deleteFriendRequest(request.user_id, accessToken),
                    )
                  }
                >
                  Decline
                </button>
              </div>
            </div>
          ))}

          {requests.outgoing.map((request) => (
            <div className="friends-row" key={request.user_id}>
              <span>
                <strong>{request.username}</strong>: outgoing
              </span>
              <button
                disabled={busy}
                onClick={() =>
                  void runAction(() =>
                    deleteFriendRequest(request.user_id, accessToken),
                  )
                }
              >
                Cancel
              </button>
            </div>
          ))}

          <h2>Friends</h2>

          {!friends.length && <p>No friends yet.</p>}

          {friends.map((friend) => (
            <div className="friends-row" key={friend.user_id}>
              <span>
                <strong>{friend.username}</strong>: since{" "}
                {new Date(friend.accepted_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
              <button
                disabled={busy}
                onClick={() => handleRemoveFriend(friend)}
              >
                Remove
              </button>
            </div>
          ))}
        </>
      )}
    </section>
  );
}
