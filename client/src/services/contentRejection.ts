import { useContentRejectionStore } from "../stores/contentRejection";

export interface RejectionResponse {
  error: "CONTENT_REJECTED";
  message: string;
  category: string;
}

export function isRejectionResponse(
  data: unknown
): data is RejectionResponse {
  return (
    typeof data === "object" &&
    data !== null &&
    "error" in data &&
    (data as { error?: unknown }).error === "CONTENT_REJECTED"
  );
}

export function handleContentRejection(data: unknown): boolean {
  if (isRejectionResponse(data)) {
    const { openRejectionModal } = useContentRejectionStore.getState();
    openRejectionModal();
    return true;
  }
  return false;
}
