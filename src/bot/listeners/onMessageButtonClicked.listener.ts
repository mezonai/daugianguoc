import { OnEvent } from '@nestjs/event-emitter';
import { Events } from 'mezon-sdk';
import { Injectable } from '@nestjs/common';
import { RoleService } from '../commands/selfAssignableRoles/role.service';
import { DauGiaService } from '../commands/auction/auction.service';
import { DauGiaStartService } from '../commands/auction/auctionStart.service';

@Injectable()
export class ListenerMessageButtonClicked {
  constructor(
    private roleService: RoleService,
    private dauGiaService: DauGiaService,
    private dauGiaStartService: DauGiaStartService,
  ) {}

  @OnEvent(Events.MessageButtonClicked)
  async hanndleButtonForm(data) {
    console.log('data', data);
    try {
      const args = data.button_id.split('_');
      const buttonConfirmType = args[0];

      console.log(buttonConfirmType);
      switch (buttonConfirmType) {
        case 'role':
          this.handleSelectRole(data);
          break;
        case 'daugia':
          this.handleDaugia(data);
          break;
        case 'joinauction':
          this.handleJoinAuction(data);
          break;
        case 'userjoinauction':
          this.handleUserJoinAuction(data);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('hanndleButtonForm ERROR', error);
    }
  }

  async handleSelectRole(data) {
    try {
      await this.roleService.handleSelectRole(data);
    } catch (error) {
      console.log('ERORR handleSelectPoll', error);
    }
  }

  async handleDaugia(data) {
    try {
      await this.dauGiaService.handleSelectDauGia(data);
    } catch (error) {
      console.log('ERORR handleSelectPoll', error);
    }
  }
  async handleJoinAuction(data) {
    try {
      await this.dauGiaStartService.handleJoinAuction(data);
    } catch (error) {
      console.log('ERORR handleSelectPoll', error);
    }
  }

  async handleUserJoinAuction(data) {
    try {
      await this.dauGiaStartService.handleUserJoinAuction(data);
    } catch (error) {
      console.log('ERORR handleSelectPoll', error);
    }
  }
}
