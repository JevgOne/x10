declare module "mammoth/mammoth.browser" {
  interface MammothResult {
    value: string;
    messages: unknown[];
  }
  interface MammothInput {
    arrayBuffer: ArrayBuffer;
  }
  function convertToHtml(input: MammothInput): Promise<MammothResult>;
  function extractRawText(input: MammothInput): Promise<MammothResult>;
  export default { convertToHtml, extractRawText };
  export { convertToHtml, extractRawText };
}

declare module "pdfjs-dist/build/pdf.mjs" {
  export const GlobalWorkerOptions: { workerSrc: string };
  export function getDocument(params: { data: ArrayBuffer }): {
    promise: Promise<{
      numPages: number;
      getPage(num: number): Promise<{
        getTextContent(): Promise<{
          items: Array<{ str: string; transform: number[] } | unknown>;
        }>;
      }>;
    }>;
  };
}
