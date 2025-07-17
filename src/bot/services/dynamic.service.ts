import { Injectable } from '@nestjs/common';

@Injectable()
export class DynamicCommandService {
  private dynamicCommandList = [];
  constructor() {}

  getDynamicCommandList() {
    return this.dynamicCommandList;
  }
}
