declare module "html5-qrcode" {
  export enum Html5QrcodeSupportedFormats {
    QR_CODE = 0,
  }

  export class Html5QrcodeScanner {
    constructor(elementId: string, config: any, verbose: boolean);
    render(
      onSuccess: (decodedText: string, decodedResult: any) => void,
      onError?: (errorMessage: string) => void
    ): void;
    clear(): Promise<void>;
    pause(shouldPauseVideo?: boolean): void;
    resume(): void;
  }
}
