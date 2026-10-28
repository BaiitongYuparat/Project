import { Tabs , useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { TabsScreen } from 'react-native-screens/lib/typescript/components/tabs/screen';

export default function TabLayout() {
    
    return (
        <Tabs
            screenOptions={{
                tabBarActiveTintColor: '#7B675A', // สีม่วงเข้มสำหรับไอคอนที่เลือก
                tabBarInactiveTintColor: '#8A776A', // สีเทาสำหรับไอคอนที่ไม่ถูกเลือก
                tabBarStyle: {
                    height: Platform.OS === 'ios' ? 85 : 65, // ปรับความสูงของ tab bar ตามแพลตฟอร์ม
                    paddingBottom: Platform.OS === 'ios' ? 25 : 10, // ปรับ padding ด้านล่างตามแพลตฟอร์ม
                    paddingTop: 4, // เพิ่ม padding ด้านบน
                },
                tabBarLabelStyle: {
                    fontSize: 12,
                    fontWeight: '600',
                },
                headerShown: false,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Home',

                    tabBarIcon: ({ size, focused }) => (
                        <Ionicons
                            name={focused ? 'home' : 'home-outline'}
                            size={size}
                            color={focused ? '#7B675A' : '#8A776A'}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="stylist"
                options={{
                    title: 'Stylist',
                    tabBarIcon: ({ size, focused }) => (
                        <Ionicons
                            name={focused ? 'sparkles' : 'sparkles-outline'}
                            size={size}
                            color={focused ? '#7B675A' : '#8A776A'}
                        />
                    ),
                }}
            />

            <Tabs.Screen
                name="vto"
                options={{
                    title: 'Try-On',
                    tabBarIcon: ({ size }) => (
                        <View
                            style={{
                                width: 60,
                                height: 40,
                                borderRadius: 25,
                                alignItems: 'center',
                                justifyContent: 'center',
                                backgroundColor: '#3F322A',
                                marginTop: -18

                            }}
                        >
                            <Ionicons
                                name="scan-outline"
                                size={size}
                                color="#FFFFFF" />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="myoutfit"
                options={{
                    title: 'My Outfit',
                    tabBarIcon: ({ size, focused }) => (

                        <Ionicons
                            name={focused ? 'shirt' : 'shirt-outline'}
                            size={size}
                            color={focused ? '#7B675A' : '#8A776A'}
                        />
                    ),
                }}
            />
            <Tabs.Screen
                name="profile"
                options={{
                    title: 'Profile',
                    tabBarIcon: ({ size, focused }) => (

                        <Ionicons
                            name={focused ? 'person' : 'person-outline'}
                            size={size}
                            color={focused ? '#7B675A' : '#8A776A'}
                        />
                    ),
                }}
            />
        </Tabs>
    );
}


