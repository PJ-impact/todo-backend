import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { UsersService } from '../users/users.service';

@Injectable()
export class AutoWipeService {
  // NestJS Logger — messages appear in the server console with context label
  private readonly logger = new Logger(AutoWipeService.name);

  constructor(private readonly usersService: UsersService) {}

  /**
   * 30-day automatic account wipe.
   *
   * This method runs every day at midnight (00:00 server time).
   *
   * Process:
   *   1. Query the database for all users where:
   *        - isActive = false  (they requested account deletion)
   *        - deletedAt < 30 days ago  (grace period has expired)
   *   2. For each such user, call hardDelete()
   *   3. The ON DELETE CASCADE on the todos table wipes their tasks automatically
   *
   * Why a cron job instead of a timer?
   *   A cron job runs on a fixed schedule regardless of server restarts.
   *   A timer would reset every time the app restarts, meaning a restart
   *   could accidentally extend someone's grace period.
   */
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async wipeInactiveAccounts() {
    this.logger.log('Running 30-day inactive account wipe job...');

    let deletedCount = 0;

    try {
      // Get all users who are inactive AND whose grace period has expired
      const staleUsers = await this.usersService.findInactiveOlderThan(30);

      for (const user of staleUsers) {
        try {
          await this.usersService.hardDelete(user.id);
          deletedCount++;
          this.logger.log(
            `Permanently deleted user ${user.id} (inactive > 30 days)`,
          );
        } catch (err) {
          // Log individual failures but keep processing the rest of the list.
          // A single failed deletion shouldn't stop the entire job.
          this.logger.error(`Failed to delete user ${user.id}: ${err.message}`);
        }
      }

      this.logger.log(
        `Wipe job complete. Permanently deleted ${deletedCount} account(s).`,
      );
    } catch (err) {
      this.logger.error(`Wipe job failed: ${err.message}`);
    }
  }
}
