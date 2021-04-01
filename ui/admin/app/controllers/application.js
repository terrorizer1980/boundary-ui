import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import config from '../config/environment';

export default class ApplicationController extends Controller {
  // =services

  @service session;
  @service intl;

  // =attributes

  notifyTimeout = config.notifyTimeout;

  get primaryLocale() {
    return this.intl.primaryLocale;
  }
  set primaryLocale(value) {
    // no op
  }
}
