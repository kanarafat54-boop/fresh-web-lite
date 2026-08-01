import type { FreshContext } from "./context";


class ContextService {

  private context: FreshContext | null = null;


  initialize(context: FreshContext) {
    this.context = context;
  }


  get(): FreshContext | null {
    return this.context;
  }


  update(
    changes: Partial<FreshContext>
  ) {

    if (!this.context) {
      return;
    }

    this.context = {
      ...this.context,
      ...changes,
      timestamp: new Date().toISOString()
    };

  }


  clear() {
    this.context = null;
  }

}


export const contextService =
new ContextService();
