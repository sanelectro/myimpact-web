import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { getNotifications, markNotificationRead } from "../../api/myImpact";
import "./NotificationsPage.css";

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  return (
    <div>
      <div className="page-heading">
        <div className="eyebrow">UPDATES</div>
        <h1>Notifications</h1>
        <p>Updates about your evidence reviews and other activity.</p>
      </div>

      {notificationsQuery.isLoading && <p role="status">Loading notifications…</p>}
      {notificationsQuery.isError && (
        <div className="surface-card error-card" role="alert">
          Could not load notifications: {notificationsQuery.error.message}
        </div>
      )}
      {notificationsQuery.data?.length === 0 && (
        <div className="surface-card">
          <p>You have no notifications yet.</p>
        </div>
      )}
      <div className="impact-list">
        {notificationsQuery.data?.map((notification) => (
          <article className="surface-card" key={notification.id}>
            <div className="eyebrow">
              {notification.status === "unread" ? "UNREAD" : "READ"}
            </div>
            <h2>{notification.title}</h2>
            <p>{notification.message}</p>
            <small>{new Date(notification.created_at).toLocaleString()}</small>
            {(notification.responses.length > 0 || notification.history.length > 0) && (
              <details className="notification-activity">
                <summary>Review activity and responses</summary>
                {notification.responses.map((response) => (
                  <div className="notification-activity-item" key={response.id}>
                    <strong>Response</strong>
                    <p>{response.response_text || "No notes provided."}</p>
                    <small>{new Date(response.created_at).toLocaleString()}</small>
                  </div>
                ))}
                {notification.history.map((event) => {
                  const reason = event.metadata.reason;
                  const notes = event.metadata.notes;
                  return (
                    <div className="notification-activity-item" key={event.id}>
                      <strong>{event.event_type.replaceAll("_", " ")}</strong>
                      {typeof reason === "string" && <span> · {reason.replaceAll("_", " ")}</span>}
                      {typeof notes === "string" && notes && <p>{notes}</p>}
                      <small>{new Date(event.created_at).toLocaleString()}</small>
                    </div>
                  );
                })}
              </details>
            )}
            <div className="notification-actions">
              {notification.related_path && (
                <Link className="text-link" to={notification.related_path}>
                  View related goal
                </Link>
              )}
              {notification.status === "unread" && (
                <button
                  className="text-link notification-read-button"
                  type="button"
                  disabled={readMutation.isPending}
                  onClick={() => readMutation.mutate(notification.id)}
                >
                  Mark as read
                </button>
              )}
            </div>
          </article>
        ))}
      </div>
      {readMutation.isError && (
        <p role="alert">
          Could not mark notification as read: {readMutation.error.message}
        </p>
      )}
    </div>
  );
}
