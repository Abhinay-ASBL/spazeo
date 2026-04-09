/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activity from "../activity.js";
import type * as ai from "../ai.js";
import type * as aiActions from "../aiActions.js";
import type * as aiHelpers from "../aiHelpers.js";
import type * as analytics from "../analytics.js";
import type * as blog from "../blog.js";
import type * as buildingAnalytics from "../buildingAnalytics.js";
import type * as buildingBlocks from "../buildingBlocks.js";
import type * as buildingUnits from "../buildingUnits.js";
import type * as buildings from "../buildings.js";
import type * as consents from "../consents.js";
import type * as contact from "../contact.js";
import type * as conversionJobs from "../conversionJobs.js";
import type * as crons from "../crons.js";
import type * as demoTours from "../demoTours.js";
import type * as emails from "../emails.js";
import type * as exteriorPanoramas from "../exteriorPanoramas.js";
import type * as floorPlanActions from "../floorPlanActions.js";
import type * as floorPlanDetails from "../floorPlanDetails.js";
import type * as floorPlanJobs from "../floorPlanJobs.js";
import type * as floorPlanProjects from "../floorPlanProjects.js";
import type * as floorPlanVersions from "../floorPlanVersions.js";
import type * as furnishedRooms from "../furnishedRooms.js";
import type * as furnitureItems from "../furnitureItems.js";
import type * as hotspots from "../hotspots.js";
import type * as http from "../http.js";
import type * as leads from "../leads.js";
import type * as newsletter from "../newsletter.js";
import type * as notifications from "../notifications.js";
import type * as passwordUtils from "../passwordUtils.js";
import type * as pricing from "../pricing.js";
import type * as reconstructionActions from "../reconstructionActions.js";
import type * as reconstructionJobs from "../reconstructionJobs.js";
import type * as scenes from "../scenes.js";
import type * as search from "../search.js";
import type * as subscriptions from "../subscriptions.js";
import type * as tours from "../tours.js";
import type * as users from "../users.js";
import type * as viewPositions from "../viewPositions.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activity: typeof activity;
  ai: typeof ai;
  aiActions: typeof aiActions;
  aiHelpers: typeof aiHelpers;
  analytics: typeof analytics;
  blog: typeof blog;
  buildingAnalytics: typeof buildingAnalytics;
  buildingBlocks: typeof buildingBlocks;
  buildingUnits: typeof buildingUnits;
  buildings: typeof buildings;
  consents: typeof consents;
  contact: typeof contact;
  conversionJobs: typeof conversionJobs;
  crons: typeof crons;
  demoTours: typeof demoTours;
  emails: typeof emails;
  exteriorPanoramas: typeof exteriorPanoramas;
  floorPlanActions: typeof floorPlanActions;
  floorPlanDetails: typeof floorPlanDetails;
  floorPlanJobs: typeof floorPlanJobs;
  floorPlanProjects: typeof floorPlanProjects;
  floorPlanVersions: typeof floorPlanVersions;
  furnishedRooms: typeof furnishedRooms;
  furnitureItems: typeof furnitureItems;
  hotspots: typeof hotspots;
  http: typeof http;
  leads: typeof leads;
  newsletter: typeof newsletter;
  notifications: typeof notifications;
  passwordUtils: typeof passwordUtils;
  pricing: typeof pricing;
  reconstructionActions: typeof reconstructionActions;
  reconstructionJobs: typeof reconstructionJobs;
  scenes: typeof scenes;
  search: typeof search;
  subscriptions: typeof subscriptions;
  tours: typeof tours;
  users: typeof users;
  viewPositions: typeof viewPositions;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
