import { 
    Injectable, 
    ComponentFactoryResolver, 
    ApplicationRef, 
    Injector, 
    EmbeddedViewRef, 
    ComponentRef, 
    Type
  } from '@angular/core';
  
  export interface DialogConfig {
    data?: any;
    width?: string;
    height?: string;
    panelClass?: string;
    backdropClass?: string;
    disableClose?: boolean;
  }
  
  export interface DialogRef {
    close: (result?: any) => void;
    afterClosed: () => Promise<any>;
  }
  
  interface DialogData {
    backdropElement: HTMLElement;
    afterClosedPromise: {
      promise: Promise<any>;
      resolve: (value: any) => void;
    };
    result: any;
  }
  
  @Injectable({
    providedIn: 'root'
  })
  export class DialogService {
    private dialogs: Map<ComponentRef<any>, DialogData> = new Map();
  
    constructor(
      private componentFactoryResolver: ComponentFactoryResolver,
      private appRef: ApplicationRef,
      private injector: Injector
    ) {}
  
    /**
     * Open a dialog with the provided component
     * @param component The component to render inside the dialog
     * @param config Dialog configuration options
     * @returns DialogRef
     */
    open<T extends object>(component: Type<T>, config: DialogConfig = {}): { componentInstance: T, dialogRef: DialogRef } {
      // Create a backdrop element
      const backdropElement = document.createElement('div');
      backdropElement.className = `dialog-backdrop ${config.backdropClass || ''}`;
      backdropElement.style.position = 'fixed';
      backdropElement.style.top = '0';
      backdropElement.style.left = '0';
      backdropElement.style.width = '100%';
      backdropElement.style.height = '100%';
      backdropElement.style.backgroundColor = 'rgba(0, 0, 0, 0.5)';
      backdropElement.style.zIndex = '1000';
      backdropElement.style.display = 'flex';
      backdropElement.style.alignItems = 'center';
      backdropElement.style.justifyContent = 'center';
  
      // Create a component factory
      const componentFactory = this.componentFactoryResolver.resolveComponentFactory(component);
      
      // Create a component reference
      const componentRef = componentFactory.create(this.injector);
      
      // Get the DOM element
      const domElem = (componentRef.hostView as EmbeddedViewRef<any>).rootNodes[0] as HTMLElement;
      
      // Set dialog container styles
      domElem.style.position = 'relative';
      domElem.style.zIndex = '1001';
      if (config.width) {
        domElem.style.width = config.width;
      }
      if (config.height) {
        domElem.style.height = config.height;
      }
      if (config.panelClass) {
        domElem.classList.add(config.panelClass);
      }
      
      // Create a promise with its resolver function
      let afterClosedResolve: (value: any) => void;
      const afterClosedPromise = new Promise<any>((resolve) => {
        afterClosedResolve = resolve;
      });
  
      // Create the DialogRef
      const dialogRef: DialogRef = {
        close: (result?: any) => {
          // Store the result
          const dialogData = this.dialogs.get(componentRef);
          if (dialogData) {
            dialogData.result = result;
            
            // Resolve the afterClosed promise
            dialogData.afterClosedPromise.resolve(result);
          }
          
          // Remove component from the DOM
          this.appRef.detachView(componentRef.hostView);
          componentRef.destroy();
          
          // Remove backdrop
          if (backdropElement.parentNode) {
            backdropElement.parentNode.removeChild(backdropElement);
          }
          
          // Remove from the dialogs map
          this.dialogs.delete(componentRef);
        },
        afterClosed: () => afterClosedPromise
      };
  
      // Store the dialog info
      this.dialogs.set(componentRef, { 
        backdropElement,
        afterClosedPromise: {
          promise: afterClosedPromise,
          resolve: afterClosedResolve!
        },
        result: undefined 
      });
      
      // Pass the dialog data to the component
      const instance = componentRef.instance;
      
      // Pass configuration data to component if provided
      if (config.data) {
        (instance as any).data = config.data;
      }
      
      // Pass the dialogRef to the component
      (instance as any).dialogRef = dialogRef;
  
      // Attach component to the ApplicationRef
      this.appRef.attachView(componentRef.hostView);
      
      // Add to the DOM
      backdropElement.appendChild(domElem);
      document.body.appendChild(backdropElement);
      
      // Handle backdrop click
      if (!config.disableClose) {
        backdropElement.addEventListener('click', (event) => {
          if (event.target === backdropElement) {
            dialogRef.close();
          }
        });
      }
  
      // Handle escape key
      if (!config.disableClose) {
        const escapeListener = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
            dialogRef.close();
            document.removeEventListener('keydown', escapeListener);
          }
        };
        document.addEventListener('keydown', escapeListener);
      }
      
      return { componentInstance: componentRef.instance, dialogRef };
    }
  }