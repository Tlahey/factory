export interface IEntity {
  id: string;
  x: number;
  y: number;
}

export interface IResource extends IEntity {
  type: 'resource';
  resourceType: string;
  amount: number;
}

export interface IBuilding extends IEntity {
  type: 'building';
  buildingType: string;
}
