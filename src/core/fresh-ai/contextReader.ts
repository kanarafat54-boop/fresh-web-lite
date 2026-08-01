import { contextService } from "../context/contextService";

class ContextReader {

  read() {
    return contextService.get();
  }

  hasContext() {
    return this.read() !== null;
  }

}

export const contextReader =
new ContextReader();
