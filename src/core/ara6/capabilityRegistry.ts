export interface Capability {

  id: string;

  name: string;

  description: string;

  tools: string[];

  ecosystems: string[];

}

class CapabilityRegistry {

  private capabilities: Capability[] = [];

  register(capability: Capability) {

    const exists = this.capabilities.find(
      c => c.id === capability.id
    );

    if (exists) return;

    this.capabilities.push(capability);

  }

  get(id: string) {

    return this.capabilities.find(
      c => c.id === id
    );

  }

  list() {

    return this.capabilities;

  }

}

export const capabilityRegistry =
new CapabilityRegistry();
