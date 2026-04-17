import 'reflect-metadata';
import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsDefined, IsEnum, IsNumber, IsObject, IsOptional, IsString, Validate, ValidateNested, } from "class-validator";
import { app, ipcRenderer } from "electron";
import { IsFunction, IsNumberOrString, IsStringEnumRecord } from './typeValidators';
import { Edge, Node, Position } from '@xyflow/react';

export enum FIELD_TYPES {
    NUMBER,
    STRING,
    BITS,
    FLOAT,
    CONTENTS
}
export enum INTERFACE_INPUT_TYPES {
    ADDRESS
}
export enum TRIGGER_TYPES {
    TIMEOUT
}

export enum IPC_CHANNELS {
    ERRORS = 'errors'
}
export enum IPC_METHODS {
    LIST_PROJECTS = 'listProjects',
    READ_FILE = 'readFile',
    SAVE_FILE = 'saveFile'
}
export enum FLOW_NODE_TYPES {
    AUTOMATON_STATE = 'AS',
    NETWORK_DEVICE = 'ND',
    SYSTEM_STATE = 'SS'
}

export class project {
    @IsString()
    name: string
    
    @ValidateNested({ each: true })
    @Type(() => protocolLayer)
    @IsArray()
    layers: protocolLayer[]

    // @ValidateNested()
    // do not validate nested until there is something to validate
    @IsObject()
    @Type(() => protocolBaseSettings)
    protocolBase: protocolBaseSettings

    // @ValidateNested()
    @IsObject()
    @Type(() => preferences)
    preferences: preferences

    @ValidateNested({ each: true })
    @Type(() => network)
    @IsArray()
    networks: network[]

    @ValidateNested({ each: true })
    @Type(() => application)
    @IsArray()
    scripts: application[]
}

export class network {
    @IsString()
    name: string

    @ValidateNested({ each: true })
    @Type(() => device)
    @IsArray()
    devices: device[]

    @ValidateNested({ each: true })
    @Type(() => simulation)
    @IsArray()
    simulations: simulation[]

    @IsObject()
    config: Record<string, string>
}

export class device {
    @IsString()
    name: string
    //arrays of automaton names that exist inside protocol layers they operate on.
    //each interface must be configured for every layer that is sees.
    @ValidateNested({each: true})
    @Type(() => deviceInterface)
    @IsArray()
    interfaces: deviceInterface[]

    @IsObject()
    //todo: add a proper validator here
    config: Record<string, string | number> //config may have any value in it (for now) and also inherit values from higher configs.

    @ValidateNested()
    @Type(() => xyFlowPos)
    @IsObject()
    onGraphPosition: xyFlowPos

    @IsBoolean()
    ownedByApp: boolean
}

export class deviceInterface {
    @IsString()
    name: string

    @ValidateNested({ each: true })
    @Type(() => layerInterface)
    @IsArray()
    interfaces: layerInterface[]

    @IsEnum(Position)
    position: Position
    @IsNumber()
    offset: number

    @ValidateNested()
    @IsObject()
    @Type(() => interfaceIpCOnfig)
    ipConfig: interfaceIpCOnfig
}
export class interfaceIpCOnfig {
    @IsNumber()
    v: 4 | 6
    @IsString()
    addr: string
    @IsNumber()
    port: number
}
export class layerInterface {
    @IsString()
    protocolLayer: string
    @IsString()
    automaton: string
    @IsObject()
    automatonConfig: Record<string, any> //has the devices the automaton sees in it
}

//used for automatic state traversal, low priority
export class application {

}

//this one holds no semantic meaning as of right now
export class simulation {
    @IsString()
    name: string

    nodes: Node[]
    edges: Edge[]
}

export class protocolLayer {
    @IsString()
    name: string

    @ValidateNested({ each: true })
    @Type(() => frame)
    @IsArray()
    frames: frame[]

    @IsString()
    @IsOptional()
    @Validate(IsFunction)
    //of type (props: {
    // outer: Uint8Array,
    // gotFromType: string, <- this is the key for the input value
    // gotFromAddr: string, <- this is the val for the input value
    // config: Record<string, string> <- this is the whole input config
    // }) => keyof frames.name
    // We don't allow user to parse the frame because parsing needs to be properly configured beforehand
    determineFrameType?: string

    @ValidateNested({ each: true })
    @Type(() => automaton)
    @IsArray()
    roles: automaton[]
}

//ipv4/ipv6/ipc
export class protocolBaseSettings {

}

//project preferences or sth
export class  preferences {
}

export class frame {
    @IsString()
    name: string //type

    @ValidateNested({ each: true })
    @Type(() => frameField)
    @IsArray()
    fields: frameField[]

    // functions for simulation
    @IsString()
    @IsOptional()
    @Validate(IsFunction)
    //of type (props: {
    // inner: Uint8Array,
    // sendingToType: string, <- this is the key for the input value
    // sendingToAddr: string, <- this is the val for the input value
    // config: Record<string, string> <- this is the whole input config
    // segment: {off: number, seg: number, segTot: number, szTot: number}
    // }) => Uint8Array
    //We allow it to see inner so it can set size and the like. It should be able to figure out everything else (for now I think).
    encapsulate?: string

    @IsString()
    @IsOptional()
    @Validate(IsFunction)
    //of type (props: {
    // inner: Uint8Array,
    // sendingToType: string, <- this is the key for the input value
    // sendingToAddr: string, <- this is the val for the input value
    // config: Record<string, string> <- this is the whole input config
    // }) => Uint8Array[]
    //Fractures the inner array into multiple pieces. The segmentation parameters are then passed to the encapsulate function
    segment?: string
    @IsString()
    @IsOptional()
    @Validate(IsFunction)
    //of type (props: {
    // frame: Object, <- this is a parsed frame
    // sendingToType: string, <- this is the key for the input value
    // sendingToAddr: string, <- this is the val for the input value
    // config: Record<string, string> <- this is the whole input config
    // }) => Uint8Array | null
    // This function may read and write intermediate results using defragRead(key)/defragWrite(key, value). When it is done it should return the inner frame (content)
    defragment?: string

    @IsArray()
    @Validate(IsFunction)
    checkFunctions: string //these are saved as strings because we will eval them later
    //((fields: frameField[]) => boolean)[] //checks if the frame is valid
}

export class frameField {
    @IsString()
    name: string
    
    @Validate(IsNumberOrString)
    size: number | string //number of bits or a function that takes an dictionary of all previously parsed fields
    
    @IsEnum(FIELD_TYPES)
    represents: FIELD_TYPES
}

export class automaton {
    @IsString()
    name: string

    @IsObject()
    @Validate(IsStringEnumRecord, [INTERFACE_INPUT_TYPES])
    inputs: Record<string, INTERFACE_INPUT_TYPES> //key - description

    @ValidateNested({ each: true })
    @Type(() => automatonState)
    @IsArray()
    states: automatonState[]
}

export class automatonState {
    @IsString()
    name: string

    @ValidateNested({ each: true })
    @Type(() => automatonAction)
    @IsArray()
    send: automatonAction[]

    @ValidateNested({ each: true })
    @Type(() => automatonAction)
    @IsArray()
    receive: automatonAction[]

    @ValidateNested({each: true})
    @Type(() => automatonChangeStateTrigger)
    @IsArray()
    triggers: automatonChangeStateTrigger[]
    //branching
    @ValidateNested()
    @Type(() => automatonLogicType)
    @IsOptional()
    logic?: automatonLogicType

    @ValidateNested()
    @Type(() => xyFlowPos)
    onGraphPosition: xyFlowPos
}

class xyFlowPos {
    @IsNumber()
    x: number
    @IsNumber()
    y: number
}
export class automatonChangeStateTrigger {
    @IsEnum(TRIGGER_TYPES)
    type: TRIGGER_TYPES
    @IsDefined()
    value: any
    @IsString()
    moveTo: string
}
export class logicEdgeDescriptionType {
    @IsString()
    moveTo: string
    @IsString()
    when: string //time is more/time is less
}

export class automatonAction {
    @IsString()
    frame: string | null //frame name
    @IsString()
    on: string //from / to who to send this to.
    @IsString()
    moveTo: string //another state
}
class automatonLogicType {
    //returns an index for the descriptions array rather than a state name so we know if it goes out of bounds
    @IsString()
    @Validate(IsFunction)
    func: string

    @ValidateNested({each:true})
    @Type(() => logicEdgeDescriptionType)
    @IsArray()
    description: logicEdgeDescriptionType[]
}

export type windowWithApi = typeof window & {api: {
    send: typeof ipcRenderer.send,
    on: (channel: string, func: (...args: any) => void) => () => void,
    once: typeof ipcRenderer.once,
    invoke: (channel: string, ...data: any[]) => Promise<any>
}}

export interface simulationProgressType {
    maxStates: number
    errors: string[]
    warnings: string[]
    abortFunction?: () => void
    foundStates: number
    done: boolean //only set to true when there are errors
}