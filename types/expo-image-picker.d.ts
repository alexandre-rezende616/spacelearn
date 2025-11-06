declare module "expo-image-picker" {
  export type MediaTypeOptions = {
    Images: string;
    Videos: string;
    All: string;
  };

  export interface ImagePickerAsset {
    uri: string;
    width: number;
    height: number;
    fileName?: string;
    mimeType?: string;
  }

  export interface ImagePickerSuccessResult {
    cancelled?: boolean;
    canceled?: boolean;
    assets?: ImagePickerAsset[];
  }

  export interface ImagePickerPermissionResponse {
    granted: boolean;
  }

  export function requestMediaLibraryPermissionsAsync(): Promise<ImagePickerPermissionResponse>;
  export function launchImageLibraryAsync(options?: {
    mediaTypes?: MediaTypeOptions | string;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
  }): Promise<ImagePickerSuccessResult>;

  export const MediaTypeOptions: {
    Images: string;
    Videos: string;
    All: string;
  };
}
