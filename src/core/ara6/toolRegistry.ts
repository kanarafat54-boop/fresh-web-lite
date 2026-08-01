export interface AraTool {

  id: string;

  name: string;

  category: string;

  description: string;

  version: string;

  enabled: boolean;

}

class ToolRegistry {

  private tools: AraTool[] = [];

  register(tool: AraTool) {

    const exists = this.tools.find(
      t => t.id === tool.id
    );

    if (exists) return;

    this.tools.push(tool);

  }

  unregister(id: string) {

    this.tools = this.tools.filter(
      tool => tool.id !== id
    );

  }

  get(id: string) {

    return this.tools.find(
      tool => tool.id === id
    );

  }

  getByCategory(category: string) {

    return this.tools.filter(
      tool => tool.category === category
    );

  }

  list() {

    return this.tools;

  }

}

export const toolRegistry =
new ToolRegistry();
