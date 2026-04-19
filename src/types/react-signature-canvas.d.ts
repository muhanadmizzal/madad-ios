declare module 'react-signature-canvas' {
  import React from 'react';
  
  interface SignatureCanvasProps {
    penColor?: string;
    canvasProps?: React.CanvasHTMLAttributes<HTMLCanvasElement>;
    backgroundColor?: string;
    dotSize?: number;
    minWidth?: number;
    maxWidth?: number;
    throttle?: number;
    velocityFilterWeight?: number;
    onEnd?: () => void;
    onBegin?: () => void;
  }
  
  class SignatureCanvas extends React.Component<SignatureCanvasProps> {
    clear(): void;
    isEmpty(): boolean;
    toDataURL(type?: string, encoderOptions?: number): string;
    fromDataURL(dataURL: string): void;
    toData(): any[];
    fromData(data: any[]): void;
    getCanvas(): HTMLCanvasElement;
    getTrimmedCanvas(): HTMLCanvasElement;
  }
  
  export default SignatureCanvas;
}
