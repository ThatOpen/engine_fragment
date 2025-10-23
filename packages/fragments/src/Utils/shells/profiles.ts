import { Plane } from "./plane";
import { Edge } from "./edge";
import { Profile } from "./profile";

export class Profiles {
  list = new Map<number, Profile>();
  plane: Plane;
  nextProfileID = 0;

  constructor(plane: Plane) {
    this.plane = plane;
  }

  add(edge: Edge) {
    const matches = this.match(edge);

    // CASE 0: No profile matches, create a new one
    if (matches.length === 0) {
      const profileId = this.nextProfileID++;
      const profile = new Profile(this.plane);
      profile.add(edge);
      this.list.set(profileId, profile);
      return;
    }

    // CASE 1: The edge matches with an existing profile
    // Just add the edge to the profile
    if (matches.length === 1) {
      const profile = this.list.get(matches[0])!;
      profile.add(edge);
      return;
    }

    // CASE 2: The edge matches with multiple profiles
    // We need to merge them with the first one
    if (matches.length > 1) {
      const profile = this.list.get(matches[0])!;
      profile.add(edge);
      // The other profile is always the second one because
      // a new edge can only match with two different profiles
      const profileToMerge = this.list.get(matches[1])!;
      profile.merge(profileToMerge);
      this.list.delete(matches[1]);
    }
  }

  getProfiles() {
    let biggestProfile: number | null = null;
    let biggestProfileSize = 0;

    for (const [profileId, profile] of this.list) {
      const area = profile.getArea();
      if (area > biggestProfileSize) {
        biggestProfileSize = area;
        biggestProfile = profileId;
      }
    }

    if (biggestProfile === null) {
      // console.log("No profiles found");
      return null;
    }

    const profile = this.list.get(biggestProfile)!.getIndices();

    const holes: number[][] = [];
    for (const [profileId, profile] of this.list) {
      if (profileId === biggestProfile) continue;
      holes.push(profile.getIndices());
    }

    return { profile, holes };
  }

  private match(edge: Edge) {
    const ids: number[] = [];
    for (const [id, profile] of this.list) {
      if (profile.match(edge) > 0) {
        ids.push(id);
      }
    }
    return ids;
  }
}
