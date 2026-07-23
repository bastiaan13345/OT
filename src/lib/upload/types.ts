export type UploadValues = {
  title: string;
  artist: string;
  genre: string;
  album: string;
  tags: string;
  license: string;
  description: string;
  price: string;
  releaseDate: string;
  allowDownload: boolean;
  published: boolean;
};

export type UploadValuePatch = Partial<UploadValues>;

export type UploadPresetView = UploadValuePatch & {
  id: string;
  name: string;
  source: "saved" | "track";
};

export type UploadSuggestions = {
  artist: string[];
  genre: string[];
  tags: string[];
  license: string[];
  album: string[];
};

export type UploadStudioData = {
  concurrency: number;
  suggestions: UploadSuggestions;
  presets: UploadPresetView[];
};

export type UploadRowStatus =
  | "reading"
  | "ready"
  | "uploading"
  | "uploaded"
  | "failed";

export type UploadRow = {
  clientId: string;
  creationKey: string;
  file: File;
  detected: UploadValuePatch;
  overrides: UploadValuePatch;
  status: UploadRowStatus;
  error: string | null;
  trackId: string | null;
};
