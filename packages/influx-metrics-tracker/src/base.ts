import { Logger } from '@ovotech/winston-logger';
import { InfluxDB } from 'influx';

export abstract class MetricsTracker {
  constructor(
    protected influx: InfluxDB,
    protected logger: Logger,
    protected staticMeta?: {
      [key: string]: any;
    },
  ) {}

  protected async trackPoint(
    measurementName: string,
    tags: { [name: string]: string },
    fields: { [name: string]: any },
  ) {
    const validTags = this.getValidTags(tags);
    this.logInvalidTags(measurementName, tags);

    try {
      await this.influx.writePoints([
        {
          measurement: measurementName,
          tags: {
            ...this.staticMeta,
            ...validTags,
          },
          fields,
        },
      ]);
    } catch (err) {
      this.logger.error('Error tracking Influx metric', {
        metric: measurementName,
        tags: JSON.stringify(validTags),
        fields: JSON.stringify(fields),
        error: err,
      });
    }
  }

  private getInvalidTagNames(tags: { [name: string]: string }) {
    return Object.entries(tags)
      .filter(([_, value]) => value.length === 0)
      .reduce((names: string[], [key, _]) => names.concat([key]), []);
  }

  private getValidTags(tags: { [name: string]: string }) {
    return Object.entries(tags)
      .filter(([_, value]) => value.length > 0)
      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
  }

  private logInvalidTags(measurementName: string, tags: { [name: string]: string }) {
    const invalidTagNames = this.getInvalidTagNames(tags);

    if (invalidTagNames.length) {
      this.logger.warn('Attempted to track tags with no value', {
        metric: measurementName,
        tagNames: invalidTagNames.sort().join(', '),
      });
    }
  }
}
