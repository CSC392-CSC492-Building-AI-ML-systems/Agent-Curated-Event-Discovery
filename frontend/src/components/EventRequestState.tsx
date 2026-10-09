export type EventRequestProps = {
    loading: boolean;
    error: string | null;
    retry: () => void;
};

export default function EventRequestState({ loading, error, retry }: EventRequestProps) {
    if (loading) return <div className="discover-empty" role="status">Loading events…</div>;
    if (error) return <div className="discover-empty" role="alert"><h3>Unable to load events</h3><p>{error}</p><button className="discover-pill" onClick={retry}>Retry</button></div>;
    return null;
}
