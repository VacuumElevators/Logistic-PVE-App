export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      AuditLog: {
        Row: {
          action: string
          createdAt: string
          entity: string
          entityId: string | null
          id: string
          metadata: Json | null
          userId: string | null
        }
        Insert: {
          action: string
          createdAt?: string
          entity: string
          entityId?: string | null
          id?: string
          metadata?: Json | null
          userId?: string | null
        }
        Update: {
          action?: string
          createdAt?: string
          entity?: string
          entityId?: string | null
          id?: string
          metadata?: Json | null
          userId?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "AuditLog_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Backorder: {
        Row: {
          createdAt: string
          expectedDate: string | null
          id: string
          location: Database["public"]["Enums"]["Location"]
          notes: string | null
          orderId: string
          partId: string
          qtyFulfilled: number
          qtyRequested: number
          status: Database["public"]["Enums"]["BackorderStatus"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          expectedDate?: string | null
          id?: string
          location: Database["public"]["Enums"]["Location"]
          notes?: string | null
          orderId: string
          partId: string
          qtyFulfilled?: number
          qtyRequested: number
          status?: Database["public"]["Enums"]["BackorderStatus"]
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          expectedDate?: string | null
          id?: string
          location?: Database["public"]["Enums"]["Location"]
          notes?: string | null
          orderId?: string
          partId?: string
          qtyFulfilled?: number
          qtyRequested?: number
          status?: Database["public"]["Enums"]["BackorderStatus"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Backorder_orderId_fkey"
            columns: ["orderId"]
            isOneToOne: false
            referencedRelation: "Order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Backorder_partId_fkey"
            columns: ["partId"]
            isOneToOne: false
            referencedRelation: "Part"
            referencedColumns: ["id"]
          },
        ]
      }
      CalendarEvent: {
        Row: {
          category: string
          createdAt: string
          description: string | null
          endDate: string
          id: string
          location: Database["public"]["Enums"]["Location"]
          refId: string | null
          refType: string | null
          startDate: string
          title: string
          updatedAt: string
        }
        Insert: {
          category: string
          createdAt?: string
          description?: string | null
          endDate: string
          id?: string
          location: Database["public"]["Enums"]["Location"]
          refId?: string | null
          refType?: string | null
          startDate: string
          title: string
          updatedAt?: string
        }
        Update: {
          category?: string
          createdAt?: string
          description?: string | null
          endDate?: string
          id?: string
          location?: Database["public"]["Enums"]["Location"]
          refId?: string | null
          refType?: string | null
          startDate?: string
          title?: string
          updatedAt?: string
        }
        Relationships: []
      }
      ContainerSlot: {
        Row: {
          approvedAt: string | null
          approvedById: string | null
          arrivedAt: string | null
          bookingRef: string | null
          containerNumber: string | null
          createdAt: string
          createdById: string
          deliveryDate: string | null
          departedAt: string | null
          destLocation: Database["public"]["Enums"]["Location"]
          eta: string | null
          etd: string | null
          fillPercent: number
          id: string
          lockedAt: string | null
          lockedById: string | null
          notes: string | null
          originLocation: Database["public"]["Enums"]["Location"]
          plannedDate: string
          routeCounter: number
          size: Database["public"]["Enums"]["ContainerSize"] | null
          status: Database["public"]["Enums"]["SlotStatus"]
          updatedAt: string
          vessel: string | null
        }
        Insert: {
          approvedAt?: string | null
          approvedById?: string | null
          arrivedAt?: string | null
          bookingRef?: string | null
          containerNumber?: string | null
          createdAt?: string
          createdById: string
          deliveryDate?: string | null
          departedAt?: string | null
          destLocation: Database["public"]["Enums"]["Location"]
          eta?: string | null
          etd?: string | null
          fillPercent?: number
          id?: string
          lockedAt?: string | null
          lockedById?: string | null
          notes?: string | null
          originLocation: Database["public"]["Enums"]["Location"]
          plannedDate: string
          routeCounter: number
          size?: Database["public"]["Enums"]["ContainerSize"] | null
          status?: Database["public"]["Enums"]["SlotStatus"]
          updatedAt?: string
          vessel?: string | null
        }
        Update: {
          approvedAt?: string | null
          approvedById?: string | null
          arrivedAt?: string | null
          bookingRef?: string | null
          containerNumber?: string | null
          createdAt?: string
          createdById?: string
          deliveryDate?: string | null
          departedAt?: string | null
          destLocation?: Database["public"]["Enums"]["Location"]
          eta?: string | null
          etd?: string | null
          fillPercent?: number
          id?: string
          lockedAt?: string | null
          lockedById?: string | null
          notes?: string | null
          originLocation?: Database["public"]["Enums"]["Location"]
          plannedDate?: string
          routeCounter?: number
          size?: Database["public"]["Enums"]["ContainerSize"] | null
          status?: Database["public"]["Enums"]["SlotStatus"]
          updatedAt?: string
          vessel?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ContainerSlot_approvedById_fkey"
            columns: ["approvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ContainerSlot_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ContainerSlot_lockedById_fkey"
            columns: ["lockedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Customer: {
        Row: {
          address: string | null
          city: string | null
          code: string
          contactName: string | null
          country: string
          createdAt: string
          email: string | null
          id: string
          location: Database["public"]["Enums"]["Location"]
          name: string
          phone: string | null
          updatedAt: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: string
          contactName?: string | null
          country: string
          createdAt?: string
          email?: string | null
          id?: string
          location: Database["public"]["Enums"]["Location"]
          name: string
          phone?: string | null
          updatedAt?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: string
          contactName?: string | null
          country?: string
          createdAt?: string
          email?: string | null
          id?: string
          location?: Database["public"]["Enums"]["Location"]
          name?: string
          phone?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      ElevatorConfiguration: {
        Row: {
          color: string
          createdAt: string
          createdById: string
          elevatorKind: Database["public"]["Enums"]["ElevatorKind"]
          engine: Database["public"]["Enums"]["ElevatorEngine"]
          id: string
          isActive: boolean
          modelId: string
          name: string
          notes: string | null
          quantity: number
          stops: number
          stopsConfig: Json | null
          updatedAt: string
        }
        Insert: {
          color: string
          createdAt?: string
          createdById: string
          elevatorKind?: Database["public"]["Enums"]["ElevatorKind"]
          engine?: Database["public"]["Enums"]["ElevatorEngine"]
          id?: string
          isActive?: boolean
          modelId: string
          name: string
          notes?: string | null
          quantity?: number
          stops: number
          stopsConfig?: Json | null
          updatedAt?: string
        }
        Update: {
          color?: string
          createdAt?: string
          createdById?: string
          elevatorKind?: Database["public"]["Enums"]["ElevatorKind"]
          engine?: Database["public"]["Enums"]["ElevatorEngine"]
          id?: string
          isActive?: boolean
          modelId?: string
          name?: string
          notes?: string | null
          quantity?: number
          stops?: number
          stopsConfig?: Json | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "ElevatorConfiguration_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ElevatorConfiguration_modelId_fkey"
            columns: ["modelId"]
            isOneToOne: false
            referencedRelation: "ElevatorModel"
            referencedColumns: ["id"]
          },
        ]
      }
      ElevatorModel: {
        Row: {
          capacity: number
          createdAt: string
          description: string | null
          id: string
          isActive: boolean
          modelCode: string
          name: string
          stops: number
          updatedAt: string
        }
        Insert: {
          capacity: number
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          modelCode: string
          name: string
          stops: number
          updatedAt?: string
        }
        Update: {
          capacity?: number
          createdAt?: string
          description?: string | null
          id?: string
          isActive?: boolean
          modelCode?: string
          name?: string
          stops?: number
          updatedAt?: string
        }
        Relationships: []
      }
      LocationProfile: {
        Row: {
          address: string | null
          city: string | null
          code: Database["public"]["Enums"]["Location"]
          country: string
          createdAt: string
          currency: string
          email: string | null
          flag: string | null
          isEnabled: boolean
          managerId: string | null
          name: string
          phone: string | null
          timezone: string | null
          updatedAt: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          code: Database["public"]["Enums"]["Location"]
          country: string
          createdAt?: string
          currency?: string
          email?: string | null
          flag?: string | null
          isEnabled?: boolean
          managerId?: string | null
          name: string
          phone?: string | null
          timezone?: string | null
          updatedAt?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          code?: Database["public"]["Enums"]["Location"]
          country?: string
          createdAt?: string
          currency?: string
          email?: string | null
          flag?: string | null
          isEnabled?: boolean
          managerId?: string | null
          name?: string
          phone?: string | null
          timezone?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "LocationProfile_managerId_fkey"
            columns: ["managerId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      LocationRoute: {
        Row: {
          createdAt: string
          destLocation: Database["public"]["Enums"]["Location"]
          id: string
          isActive: boolean
          leadTimeDays: number
          notes: string | null
          originLocation: Database["public"]["Enums"]["Location"]
          preferredWeekdays: number[] | null
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          destLocation: Database["public"]["Enums"]["Location"]
          id?: string
          isActive?: boolean
          leadTimeDays?: number
          notes?: string | null
          originLocation: Database["public"]["Enums"]["Location"]
          preferredWeekdays?: number[] | null
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          destLocation?: Database["public"]["Enums"]["Location"]
          id?: string
          isActive?: boolean
          leadTimeDays?: number
          notes?: string | null
          originLocation?: Database["public"]["Enums"]["Location"]
          preferredWeekdays?: number[] | null
          updatedAt?: string
        }
        Relationships: []
      }
      Notification: {
        Row: {
          createdAt: string
          id: string
          isRead: boolean
          link: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Insert: {
          createdAt?: string
          id?: string
          isRead?: boolean
          link?: string | null
          message: string
          title: string
          type: Database["public"]["Enums"]["NotificationType"]
          userId: string
        }
        Update: {
          createdAt?: string
          id?: string
          isRead?: boolean
          link?: string | null
          message?: string
          title?: string
          type?: Database["public"]["Enums"]["NotificationType"]
          userId?: string
        }
        Relationships: [
          {
            foreignKeyName: "Notification_userId_fkey"
            columns: ["userId"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Order: {
        Row: {
          acceptedAt: string | null
          airNumber: string | null
          airRouteCounter: number | null
          approvedAt: string | null
          approvedById: string | null
          archivedAt: string | null
          containerNumber: string | null
          createdAt: string
          createdById: string
          customerId: string | null
          declinedAt: string | null
          declineReason: string | null
          deliveredAt: string | null
          destLocation: Database["public"]["Enums"]["Location"]
          dispatchedAt: string | null
          estimatedArrivalDate: string | null
          estimatedShipDate: string | null
          fillPercent: number | null
          id: string
          notes: string | null
          orderNumber: string
          originLocation: Database["public"]["Enums"]["Location"]
          requestedDate: string | null
          routeCounter: number | null
          slotId: string | null
          status: Database["public"]["Enums"]["OrderStatus"]
          submittedAt: string | null
          supplierId: string | null
          type: Database["public"]["Enums"]["OrderType"]
          updatedAt: string
        }
        Insert: {
          acceptedAt?: string | null
          airNumber?: string | null
          airRouteCounter?: number | null
          approvedAt?: string | null
          approvedById?: string | null
          archivedAt?: string | null
          containerNumber?: string | null
          createdAt?: string
          createdById: string
          customerId?: string | null
          declinedAt?: string | null
          declineReason?: string | null
          deliveredAt?: string | null
          destLocation: Database["public"]["Enums"]["Location"]
          dispatchedAt?: string | null
          estimatedArrivalDate?: string | null
          estimatedShipDate?: string | null
          fillPercent?: number | null
          id?: string
          notes?: string | null
          orderNumber: string
          originLocation: Database["public"]["Enums"]["Location"]
          requestedDate?: string | null
          routeCounter?: number | null
          slotId?: string | null
          status?: Database["public"]["Enums"]["OrderStatus"]
          submittedAt?: string | null
          supplierId?: string | null
          type: Database["public"]["Enums"]["OrderType"]
          updatedAt?: string
        }
        Update: {
          acceptedAt?: string | null
          airNumber?: string | null
          airRouteCounter?: number | null
          approvedAt?: string | null
          approvedById?: string | null
          archivedAt?: string | null
          containerNumber?: string | null
          createdAt?: string
          createdById?: string
          customerId?: string | null
          declinedAt?: string | null
          declineReason?: string | null
          deliveredAt?: string | null
          destLocation?: Database["public"]["Enums"]["Location"]
          dispatchedAt?: string | null
          estimatedArrivalDate?: string | null
          estimatedShipDate?: string | null
          fillPercent?: number | null
          id?: string
          notes?: string | null
          orderNumber?: string
          originLocation?: Database["public"]["Enums"]["Location"]
          requestedDate?: string | null
          routeCounter?: number | null
          slotId?: string | null
          status?: Database["public"]["Enums"]["OrderStatus"]
          submittedAt?: string | null
          supplierId?: string | null
          type?: Database["public"]["Enums"]["OrderType"]
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Order_approvedById_fkey"
            columns: ["approvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_customerId_fkey"
            columns: ["customerId"]
            isOneToOne: false
            referencedRelation: "Customer"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_slotId_fkey"
            columns: ["slotId"]
            isOneToOne: false
            referencedRelation: "ContainerSlot"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Order_supplierId_fkey"
            columns: ["supplierId"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      OrderItem: {
        Row: {
          configJson: Json | null
          createdAt: string
          description: string
          elevatorModelId: string | null
          id: string
          orderId: string
          partId: string | null
          quantity: number
        }
        Insert: {
          configJson?: Json | null
          createdAt?: string
          description: string
          elevatorModelId?: string | null
          id?: string
          orderId: string
          partId?: string | null
          quantity: number
        }
        Update: {
          configJson?: Json | null
          createdAt?: string
          description?: string
          elevatorModelId?: string | null
          id?: string
          orderId?: string
          partId?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "OrderItem_elevatorModelId_fkey"
            columns: ["elevatorModelId"]
            isOneToOne: false
            referencedRelation: "ElevatorModel"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItem_orderId_fkey"
            columns: ["orderId"]
            isOneToOne: false
            referencedRelation: "Order"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "OrderItem_partId_fkey"
            columns: ["partId"]
            isOneToOne: false
            referencedRelation: "Part"
            referencedColumns: ["id"]
          },
        ]
      }
      Part: {
        Row: {
          category: string
          createdAt: string
          description: string | null
          id: string
          name: string
          reorderLevel: number
          sku: string
          stockQty: number
          supplierId: string | null
          updatedAt: string
        }
        Insert: {
          category: string
          createdAt?: string
          description?: string | null
          id?: string
          name: string
          reorderLevel?: number
          sku: string
          stockQty?: number
          supplierId?: string | null
          updatedAt?: string
        }
        Update: {
          category?: string
          createdAt?: string
          description?: string | null
          id?: string
          name?: string
          reorderLevel?: number
          sku?: string
          stockQty?: number
          supplierId?: string | null
          updatedAt?: string
        }
        Relationships: [
          {
            foreignKeyName: "Part_supplierId_fkey"
            columns: ["supplierId"]
            isOneToOne: false
            referencedRelation: "Supplier"
            referencedColumns: ["id"]
          },
        ]
      }
      Suggestion: {
        Row: {
          createdAt: string
          createdById: string
          id: string
          message: string
          resolvedAt: string | null
          resolvedById: string | null
          status: string
        }
        Insert: {
          createdAt?: string
          createdById: string
          id?: string
          message: string
          resolvedAt?: string | null
          resolvedById?: string | null
          status?: string
        }
        Update: {
          createdAt?: string
          createdById?: string
          id?: string
          message?: string
          resolvedAt?: string | null
          resolvedById?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "Suggestion_createdById_fkey"
            columns: ["createdById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "Suggestion_resolvedById_fkey"
            columns: ["resolvedById"]
            isOneToOne: false
            referencedRelation: "User"
            referencedColumns: ["id"]
          },
        ]
      }
      Supplier: {
        Row: {
          code: string
          contactName: string | null
          country: string
          createdAt: string
          email: string | null
          id: string
          location: Database["public"]["Enums"]["Location"]
          name: string
          phone: string | null
          updatedAt: string
        }
        Insert: {
          code: string
          contactName?: string | null
          country: string
          createdAt?: string
          email?: string | null
          id?: string
          location: Database["public"]["Enums"]["Location"]
          name: string
          phone?: string | null
          updatedAt?: string
        }
        Update: {
          code?: string
          contactName?: string | null
          country?: string
          createdAt?: string
          email?: string | null
          id?: string
          location?: Database["public"]["Enums"]["Location"]
          name?: string
          phone?: string | null
          updatedAt?: string
        }
        Relationships: []
      }
      User: {
        Row: {
          createdAt: string
          email: string
          id: string
          lastLoginAt: string | null
          locationId: Database["public"]["Enums"]["Location"]
          name: string
          role: Database["public"]["Enums"]["UserRole"]
          status: Database["public"]["Enums"]["UserStatus"]
          updatedAt: string
        }
        Insert: {
          createdAt?: string
          email: string
          id: string
          lastLoginAt?: string | null
          locationId: Database["public"]["Enums"]["Location"]
          name: string
          role?: Database["public"]["Enums"]["UserRole"]
          status?: Database["public"]["Enums"]["UserStatus"]
          updatedAt?: string
        }
        Update: {
          createdAt?: string
          email?: string
          id?: string
          lastLoginAt?: string | null
          locationId?: Database["public"]["Enums"]["Location"]
          name?: string
          role?: Database["public"]["Enums"]["UserRole"]
          status?: Database["public"]["Enums"]["UserStatus"]
          updatedAt?: string
        }
        Relationships: []
      }
    }
    Views: {
      PartCategoryCount: {
        Row: {
          category: string | null
          count: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      get_user_location: { Args: never; Returns: string }
      get_user_role: { Args: never; Returns: string }
      is_super_admin: { Args: never; Returns: boolean }
    }
    Enums: {
      BackorderStatus:
        | "OPEN"
        | "PARTIALLY_FULFILLED"
        | "FULFILLED"
        | "CANCELLED"
      ContainerSize: "TWENTY_FT" | "FORTY_FT" | "FORTY_HC"
      ElevatorEngine: "NONE" | "SPLIT" | "HEAD_UNIT"
      ElevatorKind: "CYLINDER" | "CUBE"
      Location: "ARGENTINA" | "USA" | "SPAIN" | "INDIA"
      NotificationType:
        | "ORDER_UPDATE"
        | "CONTAINER_UPDATE"
        | "PO_APPROVAL"
        | "BACKORDER_ALERT"
        | "SYSTEM"
      OrderStatus:
        | "DRAFT"
        | "IN_PROCESS"
        | "APPROVED"
        | "ACCEPTED"
        | "DECLINED"
        | "DISPATCHED"
        | "DELIVERED"
      OrderType: "CONTAINER" | "AIRFREIGHT"
      SlotStatus:
        | "PLANNED"
        | "LOCKED"
        | "APPROVED"
        | "DISPATCHED"
        | "DELIVERED"
        | "CANCELLED"
      UserRole: "SUPER_ADMIN" | "LOCATION_ADMIN" | "MANAGER" | "STAFF" | "VIEWER"
      UserStatus: "ACTIVE" | "INACTIVE" | "SUSPENDED"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      BackorderStatus: [
        "OPEN",
        "PARTIALLY_FULFILLED",
        "FULFILLED",
        "CANCELLED",
      ],
      ContainerSize: ["TWENTY_FT", "FORTY_FT", "FORTY_HC"],
      ElevatorEngine: ["NONE", "SPLIT", "HEAD_UNIT"],
      ElevatorKind: ["CYLINDER", "CUBE"],
      Location: ["ARGENTINA", "USA", "SPAIN", "INDIA"],
      NotificationType: [
        "ORDER_UPDATE",
        "CONTAINER_UPDATE",
        "PO_APPROVAL",
        "BACKORDER_ALERT",
        "SYSTEM",
      ],
      OrderStatus: [
        "DRAFT",
        "IN_PROCESS",
        "APPROVED",
        "ACCEPTED",
        "DECLINED",
        "DISPATCHED",
        "DELIVERED",
      ],
      OrderType: ["CONTAINER", "AIRFREIGHT"],
      SlotStatus: [
        "PLANNED",
        "LOCKED",
        "APPROVED",
        "DISPATCHED",
        "DELIVERED",
        "CANCELLED",
      ],
      UserRole: ["SUPER_ADMIN", "LOCATION_ADMIN", "MANAGER", "STAFF", "VIEWER"],
      UserStatus: ["ACTIVE", "INACTIVE", "SUSPENDED"],
    },
  },
} as const
