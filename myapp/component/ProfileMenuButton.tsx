import { Ionicons } from "@expo/vector-icons";
import { TouchableOpacity , Text , View} from "react-native";

interface MenuButtonProps {
    title: string;
    icon: React.ReactNode;
    onPress: () => void
}

export default function ProfileMenuButton ({title , icon , onPress}: MenuButtonProps) {
    return(
        <TouchableOpacity
        onPress={onPress}
        className="bg-white p-2"
        >   
            <View className="flex-row items-center ">
                <View className="mr-2">{icon}</View>
                <Text className="text-blue-main">{title}</Text>
                <Ionicons name="chevron-forward-outline" className="ml-auto" />
            </View>
            
        </TouchableOpacity>
    )
}