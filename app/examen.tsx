import { CameraView, useCameraPermissions } from 'expo-camera';
import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Button, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as ImageManipulator from 'expo-image-manipulator';
import { InterstitialAd, AdEventType, TestIds } from 'react-native-google-mobile-ads';

// ID de prueba de Google (Cámbialo por tu ID real en producción)
const adUnitId = __DEV__ ? TestIds.INTERSTITIAL : 'ca-app-pub-xxxxxxxxxxxxx/xxxxxxxx';

// Creamos la instancia fuera del componente para que persista
const interstitial = InterstitialAd.createForAdUnitId(adUnitId);

// seteamos el formato de cada variable que responde la api
interface DetalleExamen {
    item: string;
    valor: string;
    rango: string;
    estado: string;
    explicacion_simple: string;
}

interface AnalisisData {
    valido: boolean;
    tipo_examen: string;
    institucion: string;
    disclaimer: string;
    estado_general: string;
    detalles: DetalleExamen[];
    sugerencia: string;
}

export default function Examen() {
    const [permisos, requerirPermisos] = useCameraPermissions();
    const camaraRef = useRef<CameraView>(null);
    const [imagen, setImagen] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [fotoBase64, setFotoBase64] = useState<string | null | undefined>(null);
    const [analisis, setAnalisis] = useState<AnalisisData | null>(null); // Para guardar el JSON de la API

    // Estado para controlar si el anuncio está listo
    const [adLoaded, setAdLoaded] = useState(false);

    // Manejo del ciclo de vida del anuncio
    useEffect(() => {
        const unsubscribeLoaded = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setAdLoaded(true);
        });

        const unsubscribeClosed = interstitial.addAdEventListener(AdEventType.LOADED, () => {
            setAdLoaded(false);
            //Cargamos el siguiente anuncio la próxima vez que se llegue aquí
            interstitial.load();
        });

        //Cargamos el primer anuncio
        interstitial.load();

        return () => {
            unsubscribeLoaded();
            unsubscribeClosed();
        };
    },[]);
    
    if(!permisos){    
        return <View />;
    }
    
    if(!permisos.granted){
        return(
            <View style={styles.container}>
                <Text style={styles.text}>Necesitamos tu permiso para mostrar la cámara</Text>
                <Button onPress={requerirPermisos} title="Conceder permiso" />
            </View>
        );
    }

    async function tomarFoto(){
        if(camaraRef.current){
            const foto = await camaraRef.current.takePictureAsync({ 
                quality: 0.5,
            });

            // Procesamos la imagen para corregir orientación y reducir tamaño
            // ImageManipulator lee los metadatos EXIF y "endereza" la imagen automáticamente.
            const manipResult = await ImageManipulator.manipulateAsync(
                foto.uri,
                [
                    // Forzamos un ancho máximo para ahorrar tokens de Gemini (429 error)
                    // Esto también ayuda a normalizar la orientación.
                    { resize: { width: 1200 } } 
                ],
                { 
                    compress: 0.3, // Comprimimos aquí el resultado final
                    format: ImageManipulator.SaveFormat.JPEG, 
                    base64: true // Obtenemos el Base64 final aquí
                }
            );

            setImagen(manipResult.uri);
            setFotoBase64(manipResult.base64 ?? null);
        }
    }

    async function enviarAnalisis() {
        if (!fotoBase64) {
            Alert.alert("Error", "La imagen no se procesó correctamente.");
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('https://apiexamen-ji06.onrender.com/examen', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json', // Indicar que quieres JSON
                },
                body: JSON.stringify({
                    base64Image: fotoBase64
                }),
            });

            // 1. Verificar si la respuesta fue exitosa (status 200-299)
            if (!response.ok) {
                const errorTexto = await response.text();
                console.error("Error del servidor:", errorTexto);
                throw new Error(`Error del servidor: ${response.status}`);
            }

            const result = await response.json();

            if (result.success) {
                //LÓGICA DEL ANUNCIO: Si el análisis fue exitoso, mostramos el anuncio
                if(adLoaded){
                    try{
                        await interstitial.show()
                    }catch(e){
                        console.log("Error al mostrar anuncio, procediendo al resultado", e);
                    }
                }
                //una vez cerrado el anuncio mostramos el resultado
                setAnalisis(result.data);
            } else {
                Alert.alert("Atención", result.message || "Error al interpretar.");
            }

        } catch (error) {
            console.error("Detalle del error:", error);
            Alert.alert('Error', 'No se pudo conectar con el servidor. Revisa los logs.');
        } finally {
            setLoading(false);
        }
    }

    // 1. MODO CARGA: si está analizando mostramos un spinner
    if (loading){
        return(
        <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0000ff" />
            <Text style={styles.loadingText}>Analizando examen con IA...</Text>
            <Text style={styles.subText}>Esto puede tardar unos segundos</Text>
        </View>
        );
    }

    // 2. MODO RESULTADO: Si ya tenemos la respuesta de la API
    if (analisis) {
        return (
            <ScrollView style={styles.resultContainer} contentContainerStyle={{ paddingBottom: 60 }}>
                <Text style={styles.titulo}>{analisis.tipo_examen}</Text>
                <Text style={styles.institucion}>{analisis.institucion}</Text>
                
                <View style={styles.disclaimerBox}>
                    <Text style={styles.disclaimerText}>{analisis.disclaimer}</Text>
                </View>

                {/* Aquí usamos el estilo que te faltaba */}
                <Text style={styles.resumen}>{analisis.estado_general}</Text>

                {analisis.detalles.map((item, index) => {
                    // Lógica para el color de la tarjeta
                    const esAlerta = item.estado.toLowerCase() !== 'normal';
                    
                    return (
                        <View key={index} style={[styles.card, esAlerta ? styles.cardAlert : styles.cardNormal]}>
                            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.itemNombre}>{item.item}</Text>
                                <Text style={{ fontWeight: 'bold', color: esAlerta ? '#e53935' : '#4caf50' }}>
                                    {item.estado}
                                </Text>
                            </View>
                            <Text style={{ fontSize: 18, marginVertical: 4 }}>{item.valor}</Text>
                            <Text style={{ fontSize: 12, color: '#7f8c8d' }}>Ref: {item.rango}</Text>
                            <Text style={styles.itemExplicacion}>{item.explicacion_simple}</Text>
                        </View>
                    );
                })}

                <Text style={{ marginTop: 20, fontWeight: 'bold', color: '#1a5276' }}>
                    💡 {analisis.sugerencia}
                </Text>

                <TouchableOpacity style={styles.btnVolver} onPress={() => {setAnalisis(null); setImagen(null);}}>
                    <Text style={styles.btnVolverText}>NUEVO ANÁLISIS</Text>
                </TouchableOpacity>
            </ScrollView>
        );
    }

    // 3. Si ya tomamos una foto, mostramos una vista previa
    if (imagen) {
        return (
        <View style={styles.buttonsContainer}>
            <Image source={{ uri: imagen }} style={styles.camera} resizeMode="contain"/>
            <Button title="Tomar otra foto" onPress={() => {setImagen(null); setFotoBase64(null);}} />
            <Button title={loading ? "Analizando..." : "Analizar"} onPress={enviarAnalisis} disabled={loading}/>
        </View>
        );
    }

    // 4. MODO CÁMARA: El estado inicial
    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={camaraRef}>
                {/* --- RECUADRO DE GUÍA --- */}
                <View style={styles.overlayContainer}>
                    <View style={styles.scannerFrame}>
                        <Text style={styles.scannerText}>ENCUADRA TU EXAMEN AQUÍ</Text>
                    </View>
                </View>
                {/* ------------------------- */}
                <View style={styles.buttonContainer}>
                    <TouchableOpacity style={styles.captureButton} onPress={tomarFoto}>
                        <View style={styles.innerCircle}>
                            <Text style={styles.buttonText}>FOTO</Text>
                        </View>
                    </TouchableOpacity>    
                </View>    
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center' },
    buttonsContainer: {
        //position: 'absolute',
        flex: 1,
        bottom: 40, // Sube los botones 40 unidades para que no los tape la barra
        //flexDirection: 'row',
        justifyContent: 'center',
        width: '100%',
    },
    camera: { flex: 1 },
    button: {
        flex: 1,
        alignSelf: 'flex-end',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.8)',
        padding: 15,
        borderRadius: 10,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,    // Lo hace circular
        backgroundColor: 'rgba(255, 255, 255, 0.3)', // Aro exterior traslúcido
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: 'white',
    },
    innerCircle: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: 'white', // Círculo sólido interno
        justifyContent: 'center',
        alignItems: 'center',
    },
    text: { 
        fontSize: 20, 
        fontWeight: 'bold', 
        color: 'black', // Cambiado a negro si decides poner texto dentro
        textAlign: 'center'
    },
    buttonText: {
        fontSize: 12,        // Letra pequeña para que quepa
        fontWeight: 'bold',
        color: 'black',      // Negro para que resalte sobre el círculo blanco
    },

    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f8f9fa', // Un gris muy claro profesional
        padding: 20,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2c3e50', // Azul oscuro tipo "salud"
        textAlign: 'center',
    },
    subText: {
        marginTop: 10,
        fontSize: 14,
        color: '#7f8c8d', // Gris suave
        textAlign: 'center',
    },
    
    // Estilos extra para los resultados (si los necesitas)
    resultContainer: {
        flex: 1,
        backgroundColor: '#fff',
        paddingTop: 50,
        paddingHorizontal: 20,
    },
    titulo: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1a5276',
        marginBottom: 5,
    },
    institucion: {
        fontSize: 16,
        color: '#546e7a',
        marginBottom: 20,
    },
    disclaimerBox: {
        backgroundColor: '#fff3e0',
        padding: 12,
        borderRadius: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#ff9800',
        marginBottom: 20,
    },
    disclaimerText: {
        fontSize: 12,
        color: '#e65100',
        lineHeight: 18,
    },
    card: {
        padding: 15,
        borderRadius: 12,
        backgroundColor: '#fff',
        marginBottom: 12,
        elevation: 3, // Sombra en Android
        shadowColor: '#000', // Sombra en iOS
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    cardNormal: {
        borderLeftWidth: 6,
        borderLeftColor: '#4caf50', // Verde Salud
    },
    cardAlert: {
        borderLeftWidth: 6,
        borderLeftColor: '#e53935', // Rojo Alerta
    },
    itemNombre: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#263238',
    },
    itemExplicacion: {
        fontSize: 14,
        color: '#546e7a',
        marginTop: 4,
    },
    btnVolver: {
        backgroundColor: '#2980b9',
        padding: 18,
        borderRadius: 10,
        marginTop: 20,
        marginBottom: 50,
        alignItems: 'center',
    },
    btnVolverText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
    overlayContainer: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)', // Oscurece un poco los bordes para centrar la atención
        justifyContent: 'center',
        alignItems: 'center',
    },
    scannerFrame: {
        width: '85%',
        height: '60%',
        borderWidth: 2,
        borderColor: 'white',
        borderRadius: 20,
        borderStyle: 'dashed', // Hace que el borde sea punteado
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    scannerText: {
        color: 'white',
        fontSize: 14,
        fontWeight: 'bold',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 5,
        position: 'absolute',
        top: -30, // Posiciona el texto justo arriba del cuadro
    },
    
    // Mejoras al botón de captura para que no se pierda
    buttonContainer: {
        position: 'absolute',
        bottom: 50,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    resumen: {
        fontSize: 16,
        color: '#2c3e50',
        lineHeight: 22,
        fontStyle: 'italic',
        backgroundColor: '#ebf5fb', // Un azul muy suave de fondo
        padding: 15,
        borderRadius: 8,
        marginVertical: 15,
        textAlign: 'center',
        borderWidth: 1,
        borderColor: '#d6eaf8',
    },
});