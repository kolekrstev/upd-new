import { ConsoleLogger, Inject, Injectable } from '@nestjs/common';
import chalk from 'chalk';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { AnyBulkWriteOperation } from 'mongodb';
import { Types } from 'mongoose';
import { BlobStorageService } from '@dua-upd/blob-storage';
import { DbService, PageMetrics } from '@dua-upd/db';
import type { ActivityMapMetrics, IAAItemId } from '@dua-upd/types-common';
import {
  ActivityMapResult,
  AdobeAnalyticsService,
  BlobProxyService,
  DateRange,
  queryDateFormat,
  singleDatesFromDateRange,
} from '@dua-upd/external-data';
import {
  arrayToDictionary,
  arrayToDictionaryMultiref,
  prettyJson,
  today,
} from '@dua-upd/utils-common';

dayjs.extend(utc);

interface ActivityMapEntry {
  title: string;
  activity_map: ActivityMapMetrics[];
  itemId: string;
}

export type ActivityMap = ActivityMapEntry & {
  pages: Types.ObjectId[];
};

@Injectable()
export class ActivityMapService {
  constructor(
    private adobeAnalyticsService: AdobeAnalyticsService,
    private blobProxyService: BlobProxyService,
    private logger: ConsoleLogger,
    private db: DbService,
    @Inject(BlobStorageService.name) private blob: BlobStorageService
  ) {}

  async updateActivityMap(dateRange?: DateRange) {
    try {
      const latestDateResult = () =>
        this.db.collections.pageMetrics
          .findOne(
            { activity_map: { $exists: true, $not: { $size: 0 } } },
            { activity_map: 1, date: 1 }
          )
          .sort({ date: -1 })
          .exec();

      const queriesDateRange = dateRange || {
        start: dayjs
          .utc((await latestDateResult())?.['date'])
          .add(1, 'day')
          .format(queryDateFormat),
        end: today().subtract(1, 'day').endOf('day').format(queryDateFormat),
      };

      const queryStart = dayjs.utc(queriesDateRange.start);
      const queryEnd = dayjs.utc(queriesDateRange.end);

      if (queryEnd.isBefore(queryStart)) {
        this.logger.log('Page activity map already up-to-date.');
        return;
      }

      const dateRanges = (
        singleDatesFromDateRange(
          queriesDateRange,
          queryDateFormat,
          true
        ) as string[]
      )
        .map((date: string) => ({
          start: date,
          end: dayjs.utc(date).add(1, 'day').format(queryDateFormat),
        }))
        .filter((dateRange) => {
          const gapDateStart = dayjs.utc('2022-07-01');
          const gapDateEnd = dayjs.utc('2022-12-31');

          const dateIsDuringGap = dayjs
            .utc(dateRange.start)
            .isBetween(gapDateStart, gapDateEnd, 'day', '[]');

          return (
            !dateIsDuringGap &&
            dayjs.utc(dateRange.start).startOf('day') !==
              dayjs.utc().startOf('day')
          );
        });

      const blobProxy = this.blobProxyService.createProxy({
        blobModel: 'aa_raw',
        filenameGenerator: (dates: string) => `activityMap_data_${dates}.json`,
        queryExecutor: async ([dateRange, itemIdDocs]: [
          DateRange,
          IAAItemId[]
        ]) =>
          await this.adobeAnalyticsService.getPageActivityMap(
            dateRange,
            itemIdDocs
          ),
      });

      for (const dateRange of dateRanges) {
        const requestItemIdDocs = await this.updateActivityMapItemIds(
          dateRange
        );

        const activityMapResults = await blobProxy.exec(
          [dateRange, requestItemIdDocs],
          `${dateRange.start.slice(0, 10)}`
        );

        // add page refs via itemIds
        const activityMapResultsWithRefs = await this.addPageRefsToActivityMap(
          activityMapResults
        );

        // fix outbound links (remove incorrect values and "rename" correct ones)
        const cleanActivityMap = fixOutboundLinks(
          activityMapResultsWithRefs as ActivityMap[]
        );

        const bulkWriteOps: AnyBulkWriteOperation<PageMetrics>[] = [];

        for (const { activity_map, pages } of cleanActivityMap) {
          for (const page of pages) {
            bulkWriteOps.push({
              updateOne: {
                filter: {
                  date: dayjs.utc(dateRange.start).toDate(),
                  page,
                },
                update: {
                  $set: {
                    activity_map,
                  },
                },
              },
            });
          }
        }

        if (bulkWriteOps.length) {
          await this.db.collections.pageMetrics.bulkWrite(bulkWriteOps, {
            ordered: false,
          });

          this.logger.log(`Updated ${bulkWriteOps.length} records`);
        }
      }
    } catch (e) {
      this.logger.error(e);
    }
  }

  async updateActivityMapItemIds(dateRange: DateRange) {
    this.logger.log(
      chalk.blueBright(
        'Updating itemIds for dateRange: ',
        prettyJson(dateRange)
      )
    );

    const blobProxy = this.blobProxyService.createProxy({
      blobModel: 'aa_raw',
      filenameGenerator: (date: string) => `activityMap_itemIds_${date}.json`,
      queryExecutor: async (dateRange: DateRange) =>
        await this.adobeAnalyticsService.getActivityMapItemIds(dateRange),
    });

    const itemIds = await blobProxy.exec(
      dateRange,
      `${dateRange.start.slice(0, 10)}`
    );

    await this.insertItemIdsIfNew(itemIds);

    this.logger.log(chalk.green('Successfully updated itemIds.'));

    return itemIds;
  }

  async addPageRefsToItemIds(itemIds: IAAItemId[]): Promise<IAAItemId[]> {
    const urls = await this.db.collections.urls
      .find({
        all_titles: {
          $not: { $size: 0 },
          $in: itemIds.map(({ value }) => value),
        },
      })
      .lean()
      .exec();

    const urlsDict = arrayToDictionaryMultiref(urls, 'all_titles', true);

    return itemIds.map((itemId) => {
      const urls = urlsDict[itemId.value];

      const pages = urls ? { pages: urls.map((url) => url.page) } : {};

      return {
        ...itemId,
        ...pages,
      };
    });
  }

  async addPageRefsToActivityMap(
    activityMap: ActivityMapResult[]
  ): Promise<(ActivityMapResult & { pages?: Types.ObjectId[] })[]> {
    const itemIds = await this.db.collections.aaItemIds
      .find({ type: 'activityMapTitle' })
      .lean()
      .exec();

    const itemIdsDict = arrayToDictionary(itemIds, 'itemId');

    return activityMap
      .map((activityMapEntry) => {
        const { itemId } = activityMapEntry;
        const itemIdDoc = itemIdsDict[itemId];

        if (!itemIdDoc?.pages?.length) return activityMapEntry;

        return {
          ...activityMapEntry,
          pages: itemIdDoc.pages,
        };
      })
      .filter((activityMapEntry) => 'pages' in activityMapEntry);
  }

  async insertItemIdsIfNew(itemIds: IAAItemId[]) {
    const existingItemIds = await this.db.collections.aaItemIds.find({
      type: 'activityMapTitle',
    });

    const existingItemIdsDict = arrayToDictionary(existingItemIds, 'itemId');

    const newItems = itemIds
      .filter(
        (item) =>
          !existingItemIdsDict[item.itemId] && !item.value.match('https://')
      )
      .map((itemId) => ({
        _id: new Types.ObjectId(),
        type: 'activityMapTitle',
        ...itemId,
      }));

    if (newItems.length) {
      this.logger.log(
        chalk.blueBright('Finding valid Page references and inserting...')
      );
      const itemIdsWithPageRefs = await this.addPageRefsToItemIds(newItems);

      await this.db.collections.aaItemIds.insertMany(itemIdsWithPageRefs);

      this.logger.log(`Inserted ${newItems.length} new itemIds`);
    } else {
      this.logger.log('No new itemIds to insert');
    }
  }
}

export function fixOutboundLinks(activityMapEntries: ActivityMap[]) {
  const outboundLinkRegex = new RegExp(
    '^https?://.+?/([^/]+?\\.(?:pdf|txt|brf))$',
    'i'
  );
  const incorrectOutboundRegex = /^([^/]+?\.(?:pdf|txt|brf))$/i;

  return activityMapEntries.map((item) => ({
    ...item,
    activity_map: item.activity_map
      .filter(
        (activityMapItem) => !incorrectOutboundRegex.test(activityMapItem.link)
      )
      .map((activityMapItem) => {
        const match = outboundLinkRegex.exec(activityMapItem.link);

        if (match) {
          return {
            ...activityMapItem,
            link: match[1],
          };
        }

        return activityMapItem;
      }),
  }));
}
